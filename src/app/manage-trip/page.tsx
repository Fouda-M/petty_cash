"use client";

import * as React from "react";
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import TransactionTable from "@/components/transactions/TransactionTable";
import BalanceSummary from "@/components/transactions/BalanceSummary";
import PrintableReport from "@/components/print/PrintableReport";
import TripDetailsForm, { type TripDetailsFormRef } from "@/components/trip/TripDetailsForm";
import type { Transaction, ExchangeRates } from "@/types";
import type { TripDetailsFormData } from "@/lib/schemas";
import { TransactionType, Currency } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useHotkeys } from 'react-hotkeys-hook';
import { Button } from "@/components/ui/button";
import { Printer, Settings, ArrowRight, Save, ListChecks, Loader2, Edit, Trash2 } from "lucide-react";
import { DEFAULT_EXCHANGE_RATES_TO_EGP, loadExchangeRates as loadRatesFromLocal, saveExchangeRates as saveRatesToLocal } from "@/lib/exchangeRates";
import ExchangeRateManager from "@/components/settings/ExchangeRateManager";
import Link from "next/link";
import { supabase } from '@/lib/supabase/client';
import type { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import TransactionFiltersSheet from "@/components/filters/TransactionFiltersSheet";
import type { TransactionFilters } from "@/hooks/useTransactions";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ReportDataPayload {
  tripDetails: TripDetailsFormData;
  transactions: Transaction[];
  exchangeRates: ExchangeRates;
}

interface ManageTripPageContentProps { // Renamed from ManageTripPageProps
  isGuest?: boolean;
}

// This is the actual component logic
function ManageTripPageContent({ isGuest: propIsGuest }: ManageTripPageContentProps) {
  const router = useRouter(); // This hook requires client-side rendering
  const searchParams = useSearchParams(); // This hook requires client-side rendering
  const { toast } = useToast();
  const tripDetailsFormRef = React.useRef<TripDetailsFormRef>(null);

  const [user, setUser] = React.useState<User | null>(null);
  const [isGuestMode, setIsGuestMode] = React.useState(false);

  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [currentTripDetails, setCurrentTripDetails] = React.useState<TripDetailsFormData | null>(null);
  const [exchangeRates, setExchangeRates] = React.useState<ExchangeRates>(() => ({ ...DEFAULT_EXCHANGE_RATES_TO_EGP }));
  const [editingTripId, setEditingTripId] = React.useState<string | null>(null);

  const [isLoadingPage, setIsLoadingPage] = React.useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [transactionToEdit, setTransactionToEdit] = React.useState<Transaction | null>(null);
  const [isExchangeRateManagerOpen, setIsExchangeRateManagerOpen] = React.useState(false);
  const [isSavingFullTrip, setIsSavingFullTrip] = React.useState(false);
  const [reportDataForPrint, setReportDataForPrint] = React.useState<ReportDataPayload | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false);


  // Local filter state
  const [filters, setFilters] = React.useState<TransactionFilters>({});
  const filteredTransactions = React.useMemo(() => {
    return transactions.filter((t) => {
      if (filters.startDate && new Date(t.date) < new Date(filters.startDate)) return false;
      if (filters.endDate && new Date(t.date) > new Date(filters.endDate)) return false;
      if (filters.search && !t.description?.includes(filters.search)) return false;
      return true;
    });
  }, [transactions, filters]);

  // Keyboard shortcut: Ctrl+S / Cmd+S to save trip
  useHotkeys('ctrl+s,meta+s', (e) => {
    e.preventDefault();
    handleSaveFullTrip();
  }, [currentTripDetails, transactions, exchangeRates, isSavingFullTrip, isGuestMode, user]);

  React.useEffect(() => {
    let isMounted = true;
    setIsLoadingPage(true);

    const initializePage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const activeUser = session?.user ?? null;
      let activeGuestMode = propIsGuest !== undefined ? propIsGuest : (typeof window !== 'undefined' && sessionStorage.getItem('isGuest') === 'true');
      if (activeUser && activeGuestMode) {
          activeGuestMode = false;
          if (typeof window !== 'undefined') sessionStorage.removeItem('isGuest');
      }
      
      if (isMounted) {
        setUser(activeUser);
        setIsGuestMode(activeGuestMode);
      }

      if (!activeUser && !activeGuestMode) {
        if (isMounted) {
          toast({ title: "غير مصرح به", description: "يرجى تسجيل الدخول أو الاستمرار كضيف.", variant: "destructive" });
          router.push('/');
          setIsLoadingPage(false);
        }
        return;
      }

      const isNewTrip = searchParams.get('new') === 'true';
      const tripIdToEditParam = searchParams.get('edit');

      // Priority 1: New Trip Creation
      if (isNewTrip) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('tripDraft');
        }
        if (isMounted) {
          setCurrentTripDetails(null);
          setTransactions([]);
          setExchangeRates(loadRatesFromLocal());
          setEditingTripId(null);
          tripDetailsFormRef.current?.resetForm(null);
          router.replace('/manage-trip', undefined);
        }
      } 
      // Priority 2: Editing an Existing Trip
      else if (tripIdToEditParam && !activeGuestMode && activeUser) {
        setEditingTripId(tripIdToEditParam);
        try {
          const { data: tripToLoad, error: fetchError } = await supabase
            .from('trips')
            .select('*')
            .eq('id', tripIdToEditParam)
            .eq('user_id', activeUser.id)
            .single();

          if (fetchError && isMounted) {
            toast({ variant: "destructive", title: "خطأ في تحميل الرحلة", description: `لم يتم العثور على الرحلة أو حدث خطأ. سيتم بدء رحلة جديدة.` });
            setCurrentTripDetails(null);
            setTransactions([]);
            tripDetailsFormRef.current?.resetForm(null);
            router.replace('/manage-trip', undefined);
          } else if (tripToLoad && isMounted) {
            const tripData = tripToLoad as any;
            const details = tripData.details;
            if (details && details.tripStartDate && details.tripEndDate) {
                const loadedTripDetails: TripDetailsFormData = { ...details, tripStartDate: new Date(details.tripStartDate), tripEndDate: new Date(details.tripEndDate) };
                setCurrentTripDetails(loadedTripDetails);
                tripDetailsFormRef.current?.resetForm(loadedTripDetails);
            }
            const rawTransactions = Array.isArray(tripData.transactions) ? tripData.transactions : [];
            const parsedTransactions = rawTransactions.map((t: Transaction) => ({ ...t, date: new Date(t.date) })).sort((a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setTransactions(parsedTransactions);
            setExchangeRates(tripData.exchange_rates || loadRatesFromLocal());
            toast({ title: "تم تحميل الرحلة للتعديل" });
          }
        } catch (error: any) {
          if (isMounted) {
            toast({ variant: "destructive", title: "خطأ في تحميل الرحلة", description: "حدث خطأ غير متوقع. سيتم بدء رحلة جديدة." });
            router.replace('/manage-trip', undefined);
          }
        }
      } 
      // Priority 3: Load from Draft or Start Fresh
      else {
        setEditingTripId(null);
        try {
          const savedDraftRaw = localStorage.getItem('tripDraft');
          if (savedDraftRaw) {
            const savedDraft = JSON.parse(savedDraftRaw);
            if (isMounted) {
              const details = savedDraft.tripDetails;
              if (details && details.tripStartDate && details.tripEndDate) {
                const loadedTripDetails: TripDetailsFormData = { ...details, tripStartDate: new Date(details.tripStartDate), tripEndDate: new Date(details.tripEndDate) };
                setCurrentTripDetails(loadedTripDetails);
                tripDetailsFormRef.current?.resetForm(loadedTripDetails);
              }
              const rawTransactions = Array.isArray(savedDraft.transactions) ? savedDraft.transactions : [];
              const parsedTransactions = rawTransactions.map((t: Transaction) => ({ ...t, date: new Date(t.date) })).sort((a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime());
              setTransactions(parsedTransactions);
              setExchangeRates(savedDraft.exchangeRates || loadRatesFromLocal());
              toast({ title: "تم استعادة مسودة رحلة", description: "تم تحميل آخر مسودة غير محفوظة." });
            }
          } else {
            // Start completely fresh if no draft
            if (isMounted) {
              setCurrentTripDetails(null);
              setTransactions([]);
              setExchangeRates(loadRatesFromLocal());
              tripDetailsFormRef.current?.resetForm(null);
            }
          }
        } catch (e) {
          // If draft is corrupted, start fresh
          if (isMounted) {
            setCurrentTripDetails(null);
            setTransactions([]);
            setExchangeRates(loadRatesFromLocal());
            tripDetailsFormRef.current?.resetForm(null);
          }
        }
      }
      
      if (isMounted) {
        setIsLoadingPage(false);
      }
    };

    initializePage();

    return () => { 
      isMounted = false;
    };
  }, [searchParams, propIsGuest, router, toast]);

  // Auto-save trip draft to localStorage
  React.useEffect(() => {
    // Do not save draft if page is loading, in guest mode, or editing a trip from the server
    if (isLoadingPage || isGuestMode || editingTripId) {
      return;
    }

    const handler = setTimeout(() => {
      if (currentTripDetails || transactions.length > 0) {
        const draft = {
          tripDetails: currentTripDetails,
          transactions: transactions,
          exchangeRates: exchangeRates
        };
        localStorage.setItem('tripDraft', JSON.stringify(draft));
      }
    }, 1000); // Debounce saving

    return () => {
      clearTimeout(handler);
    };
  }, [currentTripDetails, transactions, exchangeRates, editingTripId, isGuestMode, isLoadingPage]);


  const handleTripDetailsUpdate = (details: TripDetailsFormData) => {
    console.log("[ManageTripPage Debug] handleTripDetailsUpdate called with:", details);
    setCurrentTripDetails(details);
  };

  const handleAddTransaction = (newTransaction: Transaction) => {
    console.log("[ManageTripPage Debug] handleAddTransaction called with:", newTransaction);
    setTransactions((prevTransactions) => 
      [...prevTransactions, newTransaction].sort((a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
  };

  const handleDeleteTransaction = (id: string) => {
    console.log(`[ManageTripPage Debug] handleDeleteTransaction called for ID: ${id}`);
    setTransactions(prev => prev.filter(t => t.id !== id));
    toast({ title: "تم حذف المعاملة" });
  };

  const handleOpenEditModal = (transaction: Transaction) => {
    console.log("[ManageTripPage Debug] handleOpenEditModal called for transaction:", transaction);
    setTransactionToEdit(transaction);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    console.log("[ManageTripPage Debug] handleCloseEditModal called.");
    setTransactionToEdit(null);
    setIsEditModalOpen(false);
  };

  const handleTransactionUpdated = (updatedTransaction: Transaction) => {
    console.log("[ManageTripPage Debug] handleTransactionUpdated called with:", updatedTransaction);
    setTransactions(prev => 
      prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
    handleCloseEditModal();
  };

  const handlePrint = async () => {
    const latestValidatedDetails = await tripDetailsFormRef.current?.validateAndGetData();
    if (!latestValidatedDetails) {
      toast({ variant: "destructive", title: "بيانات الرحلة غير صالحة", description: "يرجى مراجعة وتصحيح بيانات الرحلة في النموذج." });
      return;
    }
    
    if (transactions.length === 0 && !editingTripId && !isGuestMode) {
      toast({ variant: "destructive", title: "لا توجد معاملات", description: "يرجى إضافة معاملة واحدة على الأقل للطباعة." });
      return;
    }

    setReportDataForPrint({
        tripDetails: latestValidatedDetails,
        transactions: transactions,
        exchangeRates: exchangeRates
    });
    
    setTimeout(() => {
        if (typeof window !== "undefined") {
            window.print();
        }
        // It's better to hide the report after the print dialog is likely closed or printing started.
        // This timeout is a practical way to achieve it.
        setTimeout(() => {
            setReportDataForPrint(null);
        }, 1500); // Increased delay for hiding after print
    }, 300); // Delay for React to render the report
  };

  const handleRatesUpdate = (newRates: ExchangeRates) => {
    setExchangeRates(newRates);
    saveRatesToLocal(newRates); // Continue saving to local for guest or as a temporary cache for logged-in users
    toast({ title: "تم تحديث أسعار الصرف محليًا لهذه الرحلة" });
  };

  const handleSaveFullTrip = async () => {
    if (isGuestMode) {
        toast({ variant: "destructive", title: "غير مسموح به", description: "لحفظ الرحلات على الخادم، يرجى تسجيل الدخول أو إنشاء حساب." });
        return;
    }
    if (!user) {
      toast({ variant: "destructive", title: "خطأ", description: "المستخدم غير مسجل. يرجى تسجيل الدخول أولاً." });
      router.push('/');
      return;
    }
    setIsSavingFullTrip(true);
    const validatedTripDetails = await tripDetailsFormRef.current?.validateAndGetData();
    if (!validatedTripDetails) {
      toast({ variant: "destructive", title: "بيانات الرحلة غير مكتملة أو غير صالحة", description: "يرجى إكمال وتصحيح بيانات الرحلة في النموذج أعلاه." });
      setIsSavingFullTrip(false);
      console.error("[ManageTripPage Debug] Trip details validation failed in handleSaveFullTrip.");
      return;
    }
    
    const currentEditingTripId = editingTripId; // Use the state variable set from URL param

    if (!currentEditingTripId && transactions.length === 0) {
      toast({ variant: "destructive", title: "لا توجد معاملات", description: "يرجى إضافة معاملة واحدة على الأقل قبل حفظ رحلة جديدة." });
      setIsSavingFullTrip(false);
      return;
    }

    const tripName = `${validatedTripDetails.driverName} - ${validatedTripDetails.cityName || validatedTripDetails.countryName} - ${format(validatedTripDetails.tripStartDate, 'dd/MM/yyyy')}`;
    const detailsForDb = { ...validatedTripDetails, tripStartDate: validatedTripDetails.tripStartDate.toISOString(), tripEndDate: validatedTripDetails.tripEndDate.toISOString() };
    const transactionsForDb = transactions.map(t => ({ ...t, date: new Date(t.date).toISOString() }));
    
    const tripDataPayload = { 
        user_id: user.id, 
        name: tripName, 
        details: detailsForDb, 
        transactions: transactionsForDb, 
        exchange_rates: exchangeRates // Save current exchange rates used for this trip
    };
    console.log("[ManageTripPage Debug] Trip data to save:", JSON.stringify(tripDataPayload).substring(0,300)+'...');

    try {
      let error;
      if (currentEditingTripId) {
        console.log(`[ManageTripPage Debug] Updating trip ID: ${currentEditingTripId} on server.`);
        const { error: updateError } = await supabase.from('trips').update({ ...tripDataPayload, updated_at: new Date().toISOString() }).eq('id', currentEditingTripId).eq('user_id', user.id);
        error = updateError;
      } else {
        console.log("[ManageTripPage Debug] Inserting new trip to server.");
        const { error: insertError } = await supabase.from('trips').insert({ ...tripDataPayload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select().single();
        error = insertError;
      }
      if (error) throw error;
      toast({ title: currentEditingTripId ? "تم تحديث الرحلة بنجاح!" : "تم حفظ الرحلة بنجاح!", description: `تم ${currentEditingTripId ? 'تحديث' : 'حفظ'} رحلة "${tripName}".` });
      
      // Reset states for a new trip
      setCurrentTripDetails(null);
      setTransactions([]);
      setExchangeRates(loadRatesFromLocal()); // Reset to default local rates
      if (tripDetailsFormRef.current) tripDetailsFormRef.current.resetForm(null);
      setEditingTripId(null); // Clear editing ID
      router.replace('/saved-trips'); 

    } catch (generalError: any) {
      toast({ variant: "destructive", title: "خطأ في حفظ/تحديث الرحلة", description: generalError.message || "حدث خطأ غير متوقع." });
    } finally {
      setIsSavingFullTrip(false);
    }
  };

  const executeResetTrip = () => {
    setTransactions([]);
    setCurrentTripDetails(null);
    setEditingTripId(null);
    
    if (tripDetailsFormRef.current) {
      tripDetailsFormRef.current.resetForm();
    }

    localStorage.removeItem('tripDetailsDraft');
    localStorage.removeItem('transactionsDraft');
    
    // Clear the trip_id from the URL query params
    router.push('/manage-trip', { scroll: false });

    toast({
      title: "تم حذف المسودة",
      description: "يمكنك الآن البدء في تسجيل رحلة جديدة.",
    });
  };
  
  if (isLoadingPage) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ps-3 text-lg">جارٍ تحميل صفحة إدارة الرحلة...</p>
      </div>
    );
  }

  const saveButtonText = editingTripId ? "تحديث الرحلة بالكامل والانتقال إلى السجل" : "حفظ الرحلة بالكامل والانتقال إلى السجل";
  const saveButtonIcon = editingTripId ? <Edit className="ms-2 h-5 w-5" /> : <Save className="ms-2 h-5 w-5" />;

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-6 no-print">
        <Link href="/dashboard">
          <Button variant="outline">
            <ArrowRight className="ms-2 h-4 w-4" />
            العودة إلى لوحة التحكم
          </Button>
        </Link>
        <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
          <Button onClick={() => setIsExchangeRateManagerOpen(true)} variant="outline">
            <Settings className="ms-2 h-4 w-4" />
            أسعار الصرف
          </Button>
          <Button onClick={handlePrint} variant="outline">
            <Printer className="ms-2 h-4 w-4" />
            حفظ كـ PDF
          </Button>
          {!isGuestMode && (
            <Button onClick={() => router.push('/saved-trips')} variant="outline">
                <ListChecks className="ms-2 h-4 w-4" />
                عرض الرحلات المحفوظة
            </Button>
          )}
          <Button onClick={() => setIsResetConfirmOpen(true)} variant="destructive">
            <Trash2 className="ms-2 h-4 w-4" />
            حذف المسودة وبدأ تسجيل رحلة جديدة
          </Button>
        </div>
      </div>
      
      <TripDetailsForm ref={tripDetailsFormRef} onDetailsSubmit={handleTripDetailsUpdate} initialData={currentTripDetails} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start no-print">
        <div className="lg:col-span-1 space-y-8">
          <AddTransactionForm onTransactionAdded={handleAddTransaction} transactionToEdit={transactionToEdit} onTransactionUpdated={handleTransactionUpdated} onCancelEdit={handleCloseEditModal} destinationType={currentTripDetails?.destinationType} />
          <TransactionFiltersSheet filters={filters} onChange={setFilters} />
          <BalanceSummary transactions={filteredTransactions} exchangeRates={exchangeRates} destinationType={currentTripDetails?.destinationType} />
          
        </div>
        <div className="lg:col-span-2">
          <TransactionTable transactions={filteredTransactions} onDeleteTransaction={handleDeleteTransaction} onEditTransactionRequest={handleOpenEditModal} />
        </div>
      </div>

      {!isGuestMode && (
        <div className="mt-8 pt-6 border-t no-print">
            <Button onClick={handleSaveFullTrip} className="w-full md:w-auto" size="lg" disabled={isSavingFullTrip || (isGuestMode && !user) }>
            {isSavingFullTrip && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
            {saveButtonIcon}
            {saveButtonText}
            </Button>
        </div>
      )}

      {isEditModalOpen && transactionToEdit && (
        <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => !isOpen && handleCloseEditModal()}>
          <DialogContent className="sm:max-w-[425px] md:max-w-[600px] no-print">
            <DialogHeader>
              <DialogTitle>تعديل المعاملة</DialogTitle>
              <DialogDescription> قم بتحديث تفاصيل معاملتك هنا. انقر على حفظ عند الانتهاء. </DialogDescription>
            </DialogHeader>
            <AddTransactionForm transactionToEdit={transactionToEdit} onTransactionUpdated={handleTransactionUpdated} onCancelEdit={handleCloseEditModal} className="pt-4" destinationType={currentTripDetails?.destinationType} />
          </DialogContent>
        </Dialog>
      )}

      <ExchangeRateManager isOpen={isExchangeRateManagerOpen} onOpenChange={setIsExchangeRateManagerOpen} currentRates={exchangeRates} onRatesUpdate={handleRatesUpdate} />

      <div className={cn("print-only", !reportDataForPrint && "hidden")}>
        {reportDataForPrint && <PrintableReport transactions={reportDataForPrint.transactions} exchangeRates={reportDataForPrint.exchangeRates} tripDetails={reportDataForPrint.tripDetails} />}
      </div>

      <AlertDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيؤدي هذا الإجراء إلى حذف مسودة الرحلة الحالية بشكل دائم. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={executeResetTrip} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">نعم، احذف المسودة</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Dynamically import the content component with ssr: false
// This ensures useSearchParams and other client hooks work correctly.
const DynamicManageTripPageContent = dynamic(
  () => Promise.resolve(ManageTripPageContent), 
  { 
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ps-3 text-lg">جارٍ تحميل صفحة إدارة الرحلة...</p>
      </div>
    )
  }
);

// The default export for the page now renders the dynamically imported content
export default function ManageTripPage() {
  // This wrapper ensures that the part using useSearchParams (inside ManageTripPageContent)
  // is dynamically loaded and thus client-side rendered.
  // The isGuest prop is passed down from RootLayout or determined by the page.
  const isGuest = typeof window !== 'undefined' && sessionStorage.getItem('isGuest') === 'true'; 
  return <DynamicManageTripPageContent isGuest={isGuest} />;
}