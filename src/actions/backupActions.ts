
'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers'; // To get user session on server
import type { SavedTrip, Transaction } from '@/types'; // Assuming SavedTrip is the primary type to backup/restore

// It's generally better to initialize a Supabase client specifically for server actions
// using service_role key if admin operations are needed, or by constructing one with the user's JWT.
// For simplicity and to operate on behalf of the user, we'll try to get user from cookies.

async function getSupabaseClientForUser() {
  const cookieStore = cookies();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          // Pass cookie to Supabase to authenticate the request as the user
          // This relies on Supabase Auth Helpers for Next.js or manual cookie handling
        },
      },
       auth: {
        // autoRefreshToken: true, // Manage token refresh
        // persistSession: false, // Sessions are typically managed by cookies in SSR/server actions
        // detectSessionInUrl: false,
      },
    }
  );

  // This part is crucial and might need adjustment based on how Supabase Auth Helpers for Next.js are set up.
  // We need to ensure the client is acting as the authenticated user.
  // The most robust way is usually via `createRouteHandlerClient` or `createServerComponentClient` from `@supabase/auth-helpers-nextjs`.
  // Since this is a simple server action, we might need to manually manage session.
  // For now, let's assume direct getUser() might work if cookies are correctly forwarded or helpers are used.
  
  const { data: { user } , error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("User not authenticated for server action:", userError?.message);
    return { user: null, supabase: null, error: "User not authenticated." };
  }
  return { user, supabase, error: null };
}


export async function backupUserTripsAction(): Promise<{ success: boolean; data?: string; error?: string }> {
  console.log("[Backup Action] Attempting to backup user trips...");
  
  const { user, supabase, error: authError } = await getSupabaseClientForUser();
  if (authError || !user || !supabase) {
    return { success: false, error: authError || "User not authenticated." };
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

  const { user, supabase, error: authError } = await getSupabaseClientForUser();
  if (authError || !user || !supabase) {
    return { success: false, error: authError || "User not authenticated." };
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
    return { success: true, error: "ملف النسخ الاحتياطي فارغ." }; // Or success:true if empty restore is fine
  }

  try {
    // Strategy: Delete all existing trips for the user, then insert new ones.
    // This is simpler but destructive. A merge strategy would be more complex.
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

    // Prepare trips for insertion
    const tripsForDb = tripsToRestore.map(trip => {
        // Basic validation/transformation
        if (!trip.details || !trip.name) {
            console.warn("[Restore Action] Skipping trip due to missing details or name:", trip);
            return null; // Skip invalid trip
        }
        // Ensure transactions is an array
        const transactions = Array.isArray(trip.transactions) ? trip.transactions.map(t => ({
            ...t,
            // Ensure date is a string or valid for Supabase, amount is number
            date: typeof t.date === 'string' ? t.date : new Date(t.date).toISOString(),
            amount: Number(t.amount) || 0,
        })) : [];

        const details = {
            ...trip.details,
            tripStartDate: typeof trip.details.tripStartDate === 'string' ? trip.details.tripStartDate : new Date(trip.details.tripStartDate).toISOString(),
            tripEndDate: typeof trip.details.tripEndDate === 'string' ? trip.details.tripEndDate : new Date(trip.details.tripEndDate).toISOString(),
        };
        
      // Remove 'id' if it exists, as Supabase will generate a new one
      // Or, if you want to preserve IDs, you'd need a more complex UPSERT.
      // For simplicity, let's assume new IDs will be generated.
      const { id, ...tripDataToInsert } = trip;
      
      return {
        ...tripDataToInsert,
        details,
        transactions,
        user_id: user.id,
        // Supabase will handle created_at and updated_at by default if table is set up
        // If 'created_at' is in backup and you want to preserve it, ensure column allows it and pass it.
        // created_at: trip.createdAt ? new Date(trip.createdAt).toISOString() : new Date().toISOString(), 
        // updated_at: new Date().toISOString(),
      };
    }).filter(trip => trip !== null); // Remove any nulls from invalid trips

    if (tripsForDb.length === 0 && tripsToRestore.length > 0) {
        return { success: false, error: "جميع الرحلات في ملف النسخ الاحتياطي كانت غير صالحة للاستعادة." };
    }
    if (tripsForDb.length === 0) {
        return { success: true, error: "لا توجد رحلات صالحة في الملف للاستعادة بعد التصفية." };
    }


    console.log(`[Restore Action] Inserting ${tripsForDb.length} trips for user ${user.id}...`);
    const { error: insertError } = await supabase
      .from('trips')
      .insert(tripsForDb as any[]); // Cast as any if schema mismatch is complex during dev

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

    