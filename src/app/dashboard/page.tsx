
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Logo from '@/components/shared/Logo';
import { PlusCircle, History, Loader2, ListOrdered, DatabaseBackup, DatabaseZap } from 'lucide-react';
import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import { backupUserTripsToServerAction, listUserBackupsAction, restoreFromBackupAction } from '@/actions/backupActions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { supabase } from '@/lib/supabase/client'; // For checking guest status
import { useRouter, useSearchParams } from 'next/navigation';

interface BackupItem {
    id: string;
    backup_name: string;
    created_at: string;
}


export default function DashboardPage() {
  const { toast } = useToast();
  const [isBackingUp, setIsBackingUp] = React.useState(false);
  const [isRestoring, setIsRestoring] = React.useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = React.useState(false);
  
  const [availableBackups, setAvailableBackups] = React.useState<BackupItem[]>([]);
  const [selectedBackupId, setSelectedBackupId] = React.useState<string | undefined>(undefined);
  const [isLoadingBackups, setIsLoadingBackups] = React.useState(false);
  const [isGuestMode, setIsGuestMode] = React.useState(false);
  const [isLoadingGuestCheck, setIsLoadingGuestCheck] = React.useState(true);

  React.useEffect(() => {
      // Check guest status from session storage on client side
      const guestStatus = typeof window !== 'undefined' && sessionStorage.getItem('isGuest') === 'true';
      setIsGuestMode(guestStatus);
      setIsLoadingGuestCheck(false);
  }, []); // Empty dependency array means this runs once on mount


  const handleCreateBackup = async () => {
    if (isGuestMode) {
        toast({ variant: "destructive", title: "غير مسموح", description: "يجب تسجيل الدخول لإنشاء نسخ احتياطية على الخادم." });
        return;
    }
    setIsBackingUp(true);
    try {
      const result = await backupUserTripsToServerAction();
      if (result.success && result.backupName) {
        toast({
          title: "تم إنشاء نسخة احتياطية على الخادم",
          description: `تم حفظ النسخة "${result.backupName}" بنجاح.`,
        });
      } else {
        throw new Error(result.error || "فشل النسخ الاحتياطي على الخادم.");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في النسخ الاحتياطي",
        description: error.message || "لم يتمكن من إنشاء نسخة احتياطية على الخادم.",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const fetchAvailableBackups = async () => {
    if (isGuestMode) return;
    setIsLoadingBackups(true);
    setSelectedBackupId(undefined);
    try {
      const result = await listUserBackupsAction();
      if (result.success && result.backups) {
        setAvailableBackups(result.backups);
        if (result.backups.length === 0) {
          toast({
            variant: "default",
            title: "لا توجد نسخ احتياطية",
            description: "لم يتم العثور على نسخ احتياطية محفوظة على الخادم.",
          });
        }
      } else {
        setAvailableBackups([]);
        throw new Error(result.error || "فشل في جلب قائمة النسخ الاحتياطية.");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في جلب النسخ",
        description: error.message || "لم نتمكن من جلب قائمة النسخ الاحتياطية.",
      });
    } finally {
      setIsLoadingBackups(false);
    }
  };

  React.useEffect(() => {
    if (isRestoreDialogOpen && !isGuestMode) {
      fetchAvailableBackups();
    }
  }, [isRestoreDialogOpen, isGuestMode]);

  const handleRestoreFromServer = async () => {
    if (isGuestMode) {
        toast({ variant: "destructive", title: "غير مسموح", description: "يجب تسجيل الدخول لاستعادة النسخ من الخادم." });
        return;
    }
    if (!selectedBackupId) {
      toast({
        variant: "destructive",
        title: "لم يتم اختيار نسخة",
        description: "يرجى اختيار نسخة احتياطية من القائمة أولاً.",
      });
      return;
    }

    setIsRestoring(true);
    try {
      const result = await restoreFromBackupAction(selectedBackupId);
      if (result.success) {
        toast({
          title: "تمت الاستعادة بنجاح",
          description: "تم استيراد بيانات رحلاتك من النسخة الاحتياطية على الخادم. قد تحتاج إلى تحديث الصفحة لرؤية التغييرات.",
        });
        setIsRestoreDialogOpen(false);
        setSelectedBackupId(undefined);
      } else {
        throw new Error(result.error || "فشل في استعادة البيانات من الخادم.");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في الاستعادة",
        description: error.message || "لم يتمكن من استعادة البيانات من النسخة المختارة.",
      });
    } finally {
      setIsRestoring(false);
    }
  };
  
  if (isLoadingGuestCheck) {
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]">
            <Loader2 className="ms-2 h-8 w-8 animate-spin text-primary" />
            <p className="ps-3">جارٍ التحقق...</p>
        </div>
    );
  }

  const pageTitle = isGuestMode ? "مرحباً بك كضيف في عهدة" : "مرحباً بك في عهدة";
  const pageDescription = isGuestMode 
    ? "يمكنك تجربة تسجيل رحلة واحدة وحساب معاملاتها. لحفظ رحلات متعددة ومزامنتها، يرجى تسجيل الدخول أو إنشاء حساب."
    : "نظامك المتكامل لتتبع وإدارة عهدات الرحلات بسهولة ودقة.";

  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] p-4 md:p-8">
      <div className="mb-12 text-center">
        <Logo />
        <h1 className="text-4xl font-bold tracking-tight mt-6">{pageTitle}</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          {pageDescription}
        </p>
      </div>
      <div className="space-y-6 w-full max-w-md text-center">
        <p className="text-xl font-semibold">
          ابدأ الآن:
        </p>
 <div className="flex flex-col sm:flex-row gap-4 justify-center">
 <Link href="/manage-trip">
            <Button size="lg" className="w-full sm:w-auto text-lg py-7 px-8 shadow-lg hover:shadow-xl transition-shadow">
              <PlusCircle className="ms-2 h-6 w-6" />
              {isGuestMode ? "تجربة تسجيل رحلة" : "تسجيل رحلة جديدة"}
            </Button>
          </Link>
          {!isGuestMode && (
            <Link href="/saved-trips">
 <Button // Removed asChild prop from here
 size="lg"
 variant="outline"
                className="w-full sm:w-auto text-lg py-7 px-8 shadow-lg hover:shadow-xl transition-shadow"
                >
                <History className="ms-2 h-6 w-6" />
                الرحلات السابقة
                </Button>
            </Link>
          )}
        </div>
        {!isGuestMode && (
            <div className="pt-8 border-t mt-8">
                <p className="text-xl font-semibold mb-4">
                إدارة البيانات (على الخادم):
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button 
                        onClick={handleCreateBackup} 
                        disabled={isBackingUp || isGuestMode}
                        size="lg" 
                        variant="secondary"
                        className="w-full sm:w-auto text-lg py-7 px-8 shadow-md hover:shadow-lg transition-shadow"
                    >
                        {isBackingUp ? <Loader2 className="ms-2 h-5 w-5 animate-spin" /> : <DatabaseBackup className="ms-2 h-6 w-6" />}
                        {isBackingUp ? 'جارٍ الحفظ...' : 'إنشاء نسخة احتياطية على الخادم'}
                    </Button>
                    <Button 
                        onClick={() => setIsRestoreDialogOpen(true)} 
                        disabled={isRestoring || isGuestMode}
                        size="lg" 
                        variant="secondary"
                        className="w-full sm:w-auto text-lg py-7 px-8 shadow-md hover:shadow-lg transition-shadow"
                    >
                        <DatabaseZap className="ms-2 h-6 w-6" />
                        استعادة نسخة من الخادم
                    </Button>
                </div>
            </div>
        )}
      </div>

      <Dialog open={isRestoreDialogOpen && !isGuestMode} onOpenChange={(open) => {
          setIsRestoreDialogOpen(open);
          if (!open) {
            setAvailableBackups([]);
            setSelectedBackupId(undefined);
          }
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>استعادة البيانات من نسخة احتياطية على الخادم</DialogTitle>
            <DialogDescription>
              اختر نسخة احتياطية من القائمة أدناه. سيتم استبدال جميع الرحلات الحالية ببيانات النسخة المختارة.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {isLoadingBackups ? (
                <div className="flex items-center justify-center p-4">
                    <Loader2 className="ms-2 h-5 w-5 animate-spin" />
                    <span>جاري تحميل قائمة النسخ...</span>
                </div>
            ) : availableBackups.length > 0 ? (
              <div className="grid grid-cols-1 items-center gap-4">
                <Label htmlFor="backupSelect" className="text-right col-span-1">
                  اختر نسخة
                </Label>
                <Select value={selectedBackupId} onValueChange={setSelectedBackupId} dir="rtl">
                  <SelectTrigger id="backupSelect">
                    <SelectValue placeholder="اختر نسخة احتياطية..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBackups.map(backup => (
                      <SelectItem key={backup.id} value={backup.id}>
                        {backup.backup_name} (تاريخ الإنشاء: {format(new Date(backup.created_at), "PPpp", { locale: arSA })})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
                <p className="text-sm text-muted-foreground text-center p-4">لا توجد نسخ احتياطية متاحة على الخادم.</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => {
                setAvailableBackups([]);
                setSelectedBackupId(undefined);
              }}>إلغاء</Button>
            </DialogClose>
            <Button onClick={handleRestoreFromServer} disabled={!selectedBackupId || isRestoring || isLoadingBackups}>
              {isRestoring ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : null}
              {isRestoring ? 'جارٍ الاستعادة...' : 'استعادة النسخة المختارة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
