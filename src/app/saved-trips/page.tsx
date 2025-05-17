
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function SavedTripsPage() {
  // In the future, this page will load and display saved trips from localStorage.
  // For now, it's a placeholder.

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">الرحلات المحفوظة</h1>
        <Link href="/manage-trip" passHref legacyBehavior>
          <Button variant="outline">
             <ArrowRight className="ms-2 h-4 w-4" />
            العودة إلى إدارة رحلة / بدء رحلة جديدة
          </Button>
        </Link>
      </div>
      <div className="bg-muted/30 p-8 rounded-lg text-center">
        <p className="text-lg text-muted-foreground">
          سيتم عرض قائمة بالرحلات المحفوظة هنا قريبًا.
        </p>
      </div>
    </div>
  );
}
