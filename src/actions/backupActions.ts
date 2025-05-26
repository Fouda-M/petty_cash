
'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SavedTrip } from '@/types';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

// Helper function to get Supabase client for server actions
function getSupabaseServerClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookie = await cookies().get(name);
          const cookieStore = await cookies();
          const cookie = await cookieStore.get(name);
        },
        set(name: string, value: string, options: CookieOptions) {
          try { cookies().set({ name, value, ...options }); } catch (error) {
            console.warn(`[Supabase Server Client] Failed to set cookie '${name}'. Error:`, error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookies().set({ name, value: '', ...options });
          } catch (error) {
            console.warn(`[Supabase Server Client] Failed to remove cookie '${name}'. Error:`, error);
          }
        },
      },
    }
  );
}

// IMPORTANT: User needs to manually create a 'user_backups' table in Supabase:
// CREATE TABLE public.user_backups (
//     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
//     backup_name TEXT NOT NULL,
//     trip_data JSONB NOT NULL,
//     created_at TIMESTAMPTZ DEFAULT now() NOT NULL
// );
// And set up RLS policies for it.

export async function backupUserTripsToServerAction(): Promise<{ success: boolean; error?: string; backupName?: string }> {
  console.log("[Backup Action] Attempting to backup user trips to server...");
  const supabase = getSupabaseServerClient();
  
  const { data: { user } , error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("[Backup Action] User not authenticated for server action:", userError?.message);
    return { success: false, error: "المستخدم غير مصادق عليه." };
  }

  try {
    const { data: trips, error: fetchError } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', user.id);

    if (fetchError) {
      console.error("[Backup Action] Error fetching trips for server backup:", fetchError.message);
      return { success: false, error: `فشل في جلب الرحلات: ${fetchError.message}` };
    }

    if (!trips || trips.length === 0) {
      console.log("[Backup Action] No trips found for user to backup to server.");
      return { success: false, error: "لا توجد رحلات لإنشاء نسخة احتياطية منها." };
    }
    
    const backupName = `نسخة احتياطية - ${format(new Date(), "yyyy-MM-dd HH:mm:ss", { locale: arSA })}`;
    const tripData = trips; // Already in a suitable format (array of objects)

    const { error: insertBackupError } = await supabase
      .from('user_backups')
      .insert({
        user_id: user.id,
        backup_name: backupName,
        trip_data: tripData,
      });

    if (insertBackupError) {
      console.error("[Backup Action] Error inserting backup to user_backups table:", insertBackupError.message);
      return { success: false, error: `فشل في حفظ النسخة الاحتياطية على الخادم: ${insertBackupError.message}` };
    }

    console.log(`[Backup Action] Backup '${backupName}' created successfully on server for user:`, user.id);
    return { success: true, backupName };

  } catch (e: any) {
    console.error("[Backup Action] General error during server backup:", e.message);
    return { success: false, error: `خطأ عام أثناء النسخ الاحتياطي على الخادم: ${e.message}` };
  }
}

export async function listUserBackupsAction(): Promise<{ success: boolean; backups?: Array<{id: string; backup_name: string; created_at: string}>; error?: string }> {
  console.log("[List Backups Action] Attempting to list user backups...");
  const supabase = getSupabaseServerClient();

  const { data: { user } , error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("[List Backups Action] User not authenticated:", userError?.message);
    return { success: false, error: "المستخدم غير مصادق عليه." };
  }

  try {
    const { data, error } = await supabase
      .from('user_backups')
      .select('id, backup_name, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("[List Backups Action] Error fetching backups:", error.message);
      return { success: false, error: `فشل في جلب قائمة النسخ الاحتياطية: ${error.message}` };
    }
    return { success: true, backups: data || [] };
  } catch (e: any) {
    console.error("[List Backups Action] General error:", e.message);
    return { success: false, error: `خطأ عام: ${e.message}` };
  }
}

export async function restoreFromBackupAction(backupId: string): Promise<{ success: boolean; error?: string }> {
  console.log(`[Restore Action] Attempting to restore user trips from server backup ID: ${backupId}`);
  const supabase = getSupabaseServerClient();

  const { data: { user } , error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error("[Restore Action] User not authenticated for server action:", authError?.message);
    return { success: false, error: "المستخدم غير مصادق عليه." };
  }

  let tripsToRestore: SavedTrip[];
  try {
    const { data: backupData, error: fetchBackupError } = await supabase
      .from('user_backups')
      .select('trip_data')
      .eq('id', backupId)
      .eq('user_id', user.id)
      .single();

    if (fetchBackupError) {
      console.error("[Restore Action] Error fetching backup data from server:", fetchBackupError.message);
      return { success: false, error: `فشل في جلب بيانات النسخة الاحتياطية: ${fetchBackupError.message}` };
    }
    if (!backupData || !backupData.trip_data) {
        return { success: false, error: "لم يتم العثور على بيانات النسخة الاحتياطية أو أنها فارغة." };
    }
    tripsToRestore = backupData.trip_data as SavedTrip[];
    if (!Array.isArray(tripsToRestore)) {
      throw new Error("بيانات النسخة الاحتياطية غير صالحة (يجب أن تكون مصفوفة من الرحلات).");
    }

  } catch (e: any) {
    console.error("[Restore Action] Error parsing backup data from server:", e.message);
    return { success: false, error: `فشل في تحليل بيانات النسخة الاحتياطية: ${e.message}` };
  }

  if (tripsToRestore.length === 0) {
    console.log("[Restore Action] Server backup contains no trips to restore.");
    return { success: true, error: "النسخة الاحتياطية فارغة." }; 
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
            date: typeof t.date === 'string' ? t.date : new Date(t.date).toISOString(), // Ensure date is string for DB
            amount: Number(t.amount) || 0,
        })) : [];

        const details = {
            ...trip.details,
            tripStartDate: typeof trip.details.tripStartDate === 'string' ? trip.details.tripStartDate : new Date(trip.details.tripStartDate).toISOString(),
            tripEndDate: typeof trip.details.tripEndDate === 'string' ? trip.details.tripEndDate : new Date(trip.details.tripEndDate).toISOString(),
        };
        
      // The ID from the backup is the trip's original ID. We want the DB to generate new ones if inserting.
      // However, if the backup format relies on original trip IDs for some reason, this might need adjustment.
      // For now, let Supabase generate new IDs for the restored trips.
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
        return { success: false, error: "جميع الرحلات في النسخة الاحتياطية كانت غير صالحة للاستعادة." };
    }
    if (tripsForDb.length === 0) {
        return { success: true, error: "لا توجد رحلات صالحة في النسخة الاحتياطية للاستعادة بعد التصفية." };
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

    