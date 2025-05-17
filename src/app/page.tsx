
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Logo from '@/components/shared/Logo';
import { PlusCircle, History } from 'lucide-react';

export default function EntryPage() {
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
          <Button 
            size="lg" 
            variant="outline" 
            className="w-full sm:w-auto text-lg py-7 px-8 shadow-lg hover:shadow-xl transition-shadow" 
            disabled // Placeholder for now
            aria-disabled="true"
            title="قريباً: استعراض الرحلات السابقة"
          >
            <History className="ms-2 h-6 w-6" />
            الرحلات السابقة
          </Button>
        </div>
      </div>
      <footer className="absolute bottom-8 text-center text-muted-foreground text-sm">
        <p>© {new Date().getFullYear()} عهدة. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
}
