
// This file (page.tsx) now acts as the route entry point.
// It dynamically imports the client-heavy component.
// It should NOT have "use client"; at the top.

import dynamic from 'next/dynamic';
import { Suspense } from 'react'; // Import Suspense
import { Loader2 } from 'lucide-react';
import type { ManageTripPageProps } from './ManageTripPageClient';

const DynamicManageTripPageClient = dynamic(
  () => import('./ManageTripPageClient'), // Path to the actual client component
  {
    ssr: false, // Disable server-side rendering for this component
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ps-3 text-lg">جارٍ تحميل صفحة إدارة الرحلة...</p>
      </div>
    ),
  }
);

// The default export for the page route
// It receives props (like isGuest from Layout if passed down) and forwards them
export default function ManageTripPage(props: ManageTripPageProps) {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ps-3 text-lg">جارٍ تهيئة واجهة الرحلة...</p>
      </div>
    }>
      <DynamicManageTripPageClient {...props} />
    </Suspense>
  );
}
