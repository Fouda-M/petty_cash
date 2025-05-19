
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Logo from '@/components/shared/Logo';
import { PlusCircle, History, Download, Upload, Loader2 } from 'lucide-react';
import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import { backupUserTripsAction, restoreUserTripsAction } from '@/actions/backupActions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DashboardPage() {
  const { toast } = useToast();
  const [isBackingUp, setIsBackingUp] = React.useState(false);
  const [isRestoring, setIsRestoring] = React.useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const result = await backupUserTripsAction();
      if (result.success && result.data) {
        const jsonData = result.data;
        const blob = new Blob([jsonData], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ohda_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({
          title: "تم النسخ الاحتياطي بنجاح",
          description: "تم تنزيل بيانات رحلاتك.",
        });
      } else {
        throw new Error(result.error || "فشل النسخ الاحتياطي.");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في النسخ الاحتياطي",
        description: error.message || "لم يتمكن من إنشاء نسخة احتياطية.",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleRestore = async () => {
    if (!selectedFile) {
      toast({
        variant: "destructive",
        title: "لم يتم اختيار ملف",
        description: "يرجى اختيار ملف النسخ الاحتياطي أولاً.",
      });
      return;
    }

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const fileContent = e.target?.result as string;
        if (!fileContent) {
          throw new Error("فشل في قراءة محتوى الملف.");
        }
        // Validate if it's JSON (basic check)
        try {
          JSON.parse(fileContent);
        } catch (jsonError) {
          throw new Error("الملف المختار ليس بتنسيق JSON صالح.");
        }

        const result = await restoreUserTripsAction(selectedFile.name, fileContent);
        if (result.success) {
          toast({
            title: "تمت الاستعادة بنجاح",
            description: "تم استيراد بيانات رحلاتك. قد تحتاج إلى تحديث الصفحة لرؤية التغييرات.",
          });
          setIsRestoreDialogOpen(false);
          setSelectedFile(null);
        } else {
          throw new Error(result.error || "فشل في استعادة البيانات.");
        }
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "خطأ في الاستعادة",
          description: error.message || "لم يتمكن من استعادة البيانات من الملف.",
        });
      } finally {
        setIsRestoring(false);
      }
    };
    reader.onerror = () => {
      toast({
        variant: "destructive",
        title: "خطأ في قراءة الملف",
        description: "لم نتمكن من قراءة الملف المختار.",
      });
      setIsRestoring(false);
    };
    reader.readAsText(selectedFile);
  };

  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] p-4 md:p-8">
      <div className="mb-12 text-center">
        <Logo />
        <h1 className="text-4xl font-bold tracking-tight mt-6">مرحباً بك في عهدة</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          نظامك المتكامل لتتبع وإدارة عهدات الرحلات بسهولة ودقة.
        </p>
      </div>
      <div className="space-y-6 w-full max-w-md text-center">
        <p className="text-xl font-semibold">
          ابدأ الآن:
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/manage-trip" passHref legacyBehavior>
            <Button size="lg" className="w-full sm:w-auto text-lg py-7 px-8 shadow-lg hover:shadow-xl transition-shadow">
              <PlusCircle className="ms-2 h-6 w-6" />
              تسجيل رحلة جديدة
            </Button>
          </Link>
          <Link href="/saved-trips" passHref legacyBehavior>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full sm:w-auto text-lg py-7 px-8 shadow-lg hover:shadow-xl transition-shadow"
            >
              <History className="ms-2 h-6 w-6" />
              الرحلات السابقة
            </Button>
          </Link>
        </div>
        <div className="pt-8 border-t mt-8">
            <p className="text-xl font-semibold mb-4">
             إدارة البيانات:
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                    onClick={handleBackup} 
                    disabled={isBackingUp}
                    size="lg" 
                    variant="secondary"
                    className="w-full sm:w-auto text-lg py-7 px-8 shadow-md hover:shadow-lg transition-shadow"
                >
                    {isBackingUp ? <Loader2 className="ms-2 h-5 w-5 animate-spin" /> : <Download className="ms-2 h-6 w-6" />}
                    {isBackingUp ? 'جارٍ النسخ...' : 'النسخ الاحتياطي لبياناتي'}
                </Button>
                <Button 
                    onClick={() => setIsRestoreDialogOpen(true)} 
                    disabled={isRestoring}
                    size="lg" 
                    variant="secondary"
                    className="w-full sm:w-auto text-lg py-7 px-8 shadow-md hover:shadow-lg transition-shadow"
                >
                    <Upload className="ms-2 h-6 w-6" />
                    استعادة بياناتي
                </Button>
            </div>
        </div>
      </div>

      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>استعادة البيانات من نسخة احتياطية</DialogTitle>
            <DialogDescription>
              اختر ملف النسخ الاحتياطي (.json) الذي قمت بتنزيله مسبقًا. سيتم استبدال جميع الرحلات الحالية ببيانات الملف.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="backupFile" className="text-right col-span-1">
                ملف النسخة
              </Label>
              <Input 
                id="backupFile" 
                type="file" 
                accept=".json" 
                onChange={handleFileChange}
                className="col-span-3" 
              />
            </div>
            {selectedFile && <p className="text-sm text-muted-foreground">الملف المختار: {selectedFile.name}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => setSelectedFile(null)}>إلغاء</Button>
            </DialogClose>
            <Button onClick={handleRestore} disabled={!selectedFile || isRestoring}>
              {isRestoring ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : null}
              {isRestoring ? 'جارٍ الاستعادة...' : 'رفع واستعادة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    