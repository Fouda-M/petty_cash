
'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr'; // Updated import
import { cookies } from 'next/headers';
import type { SavedTrip, Transaction } from '@/types'; // Assuming SavedTrip is the primary type to backup/restore

// Helper function to get Supabase client for server actions
function getSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // This usually happens when the path is not available.
            // If you see this error, please check your Next.js Middleware configuration
            console.warn(`[Supabase Server Client] Failed to set cookie '${name}'. Error:`, error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // This usually happens when the path is not available.
            // If you see this error, please check your Next.js Middleware configuration
            console.warn(`[Supabase Server Client] Failed to remove cookie '${name}'. Error:`, error);
          }
        },
      },
    }
  );
}


export async function backupUserTripsAction(): Promise<{ success: boolean; data?: string; error?: string }> {
  console.log("[Backup Action] Attempting to backup user trips...");
  const supabase = getSupabaseServerClient();
  
  const { data: { user } , error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("[Backup Action] User not authenticated for server action:", userError?.message);
    return { success: false, error: "User not authenticated." };
  }

  try {
    const { data: trips, error } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error("[Backup Action] Error fetching trips:", error.message);
      return { success: false, error: `فشل في جلب الرحلات: ${error.message}` };
    }

    if (!trips) {
      console.log("[Backup Action] No trips found for user.");
      return { success: true, data: JSON.stringify([], null, 2) }; // Return empty array if no trips
    }
    
    // Basic serialization, ensure dates are ISO strings if they are Date objects
    const serializableTrips = trips.map(trip => ({
        ...trip,
        details: {
            ...trip.details,
            tripStartDate: trip.details.tripStartDate instanceof Date ? trip.details.tripStartDate.toISOString() : trip.details.tripStartDate,
            tripEndDate: trip.details.tripEndDate instanceof Date ? trip.details.tripEndDate.toISOString() : trip.details.tripEndDate,
        },
        transactions: Array.isArray(trip.transactions) ? trip.transactions.map((t: any) => ({
            ...t,
            date: t.date instanceof Date ? t.date.toISOString() : t.date,
        })) : [],
        created_at: trip.created_at instanceof Date ? trip.created_at.toISOString() : trip.created_at,
        updated_at: trip.updated_at instanceof Date ? trip.updated_at.toISOString() : trip.updated_at,
    }));


    const jsonData = JSON.stringify(serializableTrips, null, 2);
    console.log("[Backup Action] Backup data generated for user:", user.id);
    return { success: true, data: jsonData };

  } catch (e: any) {
    console.error("[Backup Action] General error during backup:", e.message);
    return { success: false, error: `خطأ عام أثناء النسخ الاحتياطي: ${e.message}` };
  }
}

export async function restoreUserTripsAction(fileName: string, fileContent: string): Promise<{ success: boolean; error?: string }> {
  console.log(`[Restore Action] Attempting to restore user trips from file: ${fileName}`);
  const supabase = getSupabaseServerClient();

  const { data: { user } , error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error("[Restore Action] User not authenticated for server action:", authError?.message);
    return { success: false, error: "User not authenticated." };
  }

  let tripsToRestore: SavedTrip[];
  try {
    tripsToRestore = JSON.parse(fileContent);
    if (!Array.isArray(tripsToRestore)) {
      throw new Error("ملف النسخ الاحتياطي غير صالح (يجب أن يكون مصفوفة من الرحلات).");
    }
  } catch (e: any) {
    console.error("[Restore Action] Error parsing backup file:", e.message);
    return { success: false, error: `فشل في تحليل ملف النسخ الاحتياطي: ${e.message}` };
  }

  if (tripsToRestore.length === 0) {
    console.log("[Restore Action] Backup file contains no trips to restore.");
    return { success: true, error: "ملف النسخ الاحتياطي فارغ." }; 
  }

  try {
    console.log(`[Restore Action] Deleting existing trips for user ${user.id}...`);
    const { error: deleteError } = await supabase
      .from('trips')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error("[Restore Action] Error deleting existing trips:", deleteError.message);
      return { success: false, error: `فشل في حذف الرحلات الحالية: ${deleteError.message}` };
    }
    console.log(`[Restore Action] Existing trips deleted for user ${user.id}.`);

    const tripsForDb = tripsToRestore.map(trip => {
        if (!trip.details || !trip.name) {
            console.warn("[Restore Action] Skipping trip due to missing details or name:", trip);
            return null; 
        }
        const transactions = Array.isArray(trip.transactions) ? trip.transactions.map(t => ({
            ...t,
            date: typeof t.date === 'string' ? t.date : new Date(t.date).toISOString(),
            amount: Number(t.amount) || 0,
        })) : [];

        const details = {
            ...trip.details,
            tripStartDate: typeof trip.details.tripStartDate === 'string' ? trip.details.tripStartDate : new Date(trip.details.tripStartDate).toISOString(),
            tripEndDate: typeof trip.details.tripEndDate === 'string' ? trip.details.tripEndDate : new Date(trip.details.tripEndDate).toISOString(),
        };
        
      const { id, ...tripDataToInsert } = trip;
      
      return {
        ...tripDataToInsert,
        details,
        transactions,
        user_id: user.id,
        // created_at and updated_at will be handled by DB defaults or triggers
      };
    }).filter(trip => trip !== null); 

    if (tripsForDb.length === 0 && tripsToRestore.length > 0) {
        return { success: false, error: "جميع الرحلات في ملف النسخ الاحتياطي كانت غير صالحة للاستعادة." };
    }
    if (tripsForDb.length === 0) {
        return { success: true, error: "لا توجد رحلات صالحة في الملف للاستعادة بعد التصفية." };
    }


    console.log(`[Restore Action] Inserting ${tripsForDb.length} trips for user ${user.id}...`);
    const { error: insertError } = await supabase
      .from('trips')
      .insert(tripsForDb as any[]); 

    if (insertError) {
      console.error("[Restore Action] Error inserting new trips:", insertError.message);
      return { success: false, error: `فشل في إدراج الرحلات الجديدة: ${insertError.message}` };
    }

    console.log(`[Restore Action] ${tripsForDb.length} trips restored successfully for user ${user.id}.`);
    return { success: true };

  } catch (e: any) {
    console.error("[Restore Action] General error during restore process:", e.message);
    return { success: false, error: `خطأ عام أثناء عملية الاستعادة: ${e.message}` };
  }
}
