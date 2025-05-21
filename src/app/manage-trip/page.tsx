
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import TransactionTable from "@/components/transactions/TransactionTable";
import BalanceSummary from "@/components/transactions/BalanceSummary";
import PrintableReport from "@/components/print/PrintableReport";
import TripDetailsForm, { type TripDetailsFormRef } from "@/components/trip/TripDetailsForm";
import type { Transaction, ExchangeRates, SavedTrip, ReportDataPayload } from "@/types";
import type { TripDetailsFormData } from "@/lib/schemas";
import { TransactionType, Currency } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Printer, Settings, ArrowRight, Save, ListChecks, Loader2, Edit } from "lucide-react";
import { DEFAULT_EXCHANGE_RATES_TO_USD, loadExchangeRates as loadRatesFromLocal, saveExchangeRates as saveRatesToLocal } from "@/lib/exchangeRates";
import ExchangeRateManager from "@/components/settings/ExchangeRateManager";
import Link from "next/link";
import { supabase } from '@/lib/supabase/client';
import type { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ManageTripPageProps {
  isGuest?: boolean; // Prop to indicate guest mode
}

export default function ManageTripPage({ isGuest: propIsGuest }: ManageTripPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const tripDetailsFormRef = React.useRef<TripDetailsFormRef>(null);

  // Local states for user and guest mode, initialized based on prop or sessionStorage
  const [user, setUser] = React.useState<User | null>(null);
  const [isGuestMode, setIsGuestMode] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return propIsGuest !== undefined ? propIsGuest : sessionStorage.getItem('isGuest') === 'true';
    }
    return propIsGuest !== undefined ? propIsGuest : false;
  });

  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [currentTripDetails, setCurrentTripDetails] = React.useState<TripDetailsFormData | null>(null);
  const [exchangeRates, setExchangeRates] = React.useState<ExchangeRates>(() => ({ ...DEFAULT_EXCHANGE_RATES_TO_USD }));
  const [editingTripId, setEditingTripId] = React.useState<string | null>(null);

  const [isLoadingPage, setIsLoadingPage] = React.useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [transactionToEdit, setTransactionToEdit] = React.useState<Transaction | null>(null);
  const [isExchangeRateManagerOpen, setIsExchangeRateManagerOpen] = React.useState(false);
  const [isSavingFullTrip, setIsSavingFullTrip] = React.useState(false);
  const [reportDataForPrint, setReportDataForPrint] = React.useState<ReportDataPayload | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    console.log("[ManageTripPage Debug] Main useEffect triggered. propIsGuest:", propIsGuest, "searchParams:", searchParams.get('edit'));
    setIsLoadingPage(true);

    const initializePage = async () => {
      // Determine current user and guest status for this load cycle
      const { data: { session } } = await supabase.auth.getSession();
      const activeUser = session?.user ?? null;
      
      let activeGuestMode = propIsGuest !== undefined ? propIsGuest : (typeof window !== 'undefined' && sessionStorage.getItem('isGuest') === 'true');
      if (activeUser && activeGuestMode) { // User logged in, but guest mode was somehow set, correct it.
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

      const tripIdToEditParam = searchParams.get('edit');
      console.log("[ManageTripPage Debug] tripIdToEditParam:", tripIdToEditParam, "activeGuestMode:", activeGuestMode, "activeUser:", !!activeUser);

      if (tripIdToEditParam && !activeGuestMode && activeUser) {
        console.log(`[ManageTripPage Debug] Attempting to load trip ID: ${tripIdToEditParam} for editing.`);
        setEditingTripId(tripIdToEditParam);
        try {
          const { data: tripToLoad, error: fetchError } = await supabase
            .from('trips')
            .select('*')
            .eq('id', tripIdToEditParam)
            .eq('user_id', activeUser.id)
            .single();

          if (fetchError && isMounted) {
            toast({ variant: "destructive", title: "خطأ في تحميل الرحلة", description: `لم يتم العثور على الرحلة أو حدث خطأ: ${fetchError.message}. سيتم بدء رحلة جديدة.` });
            if (isMounted) {
                setCurrentTripDetails(null);
                setTransactions([]);
                setExchangeRates(loadRatesFromLocal());
                tripDetailsFormRef.current?.resetForm(null);
                setEditingTripId(null); // Clear editingTripId as we are defaulting to new
                 router.replace('/manage-trip', undefined);
                console.log("[ManageTripPage Debug] Error loading edit trip, defaulted to new trip.");
            }
          } else if (tripToLoad && isMounted) {
            const tripData = tripToLoad as any;
            const details = tripData.details;
             if (details && details.tripStartDate && details.tripEndDate) {
                const loadedTripDetails: TripDetailsFormData = { ...details, tripStartDate: new Date(details.tripStartDate), tripEndDate: new Date(details.tripEndDate) };
                setCurrentTripDetails(loadedTripDetails);
                tripDetailsFormRef.current?.resetForm(loadedTripDetails);
            } else {
                 setCurrentTripDetails(null);
                 tripDetailsFormRef.current?.resetForm(null);
            }
            const rawTransactions = Array.isArray(tripData.transactions) ? tripData.transactions : [];
            const parsedTransactions = rawTransactions.map((t: any) => ({ ...t, id: t.id || crypto.randomUUID(), date: new Date(t.date), amount: Number(t.amount) || 0, type: t.type as TransactionType })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setTransactions(parsedTransactions);
            setExchangeRates(tripData.exchange_rates || loadRatesFromLocal());
            toast({ title: "تم تحميل الرحلة للتعديل", description: `يتم الآن تعديل رحلة: ${tripData.name || 'غير مسماة'}` });
            console.log("[ManageTripPage Debug] Successfully loaded trip for editing. Transactions count:", parsedTransactions.length);
          } else if (isMounted) { // Trip not found or other issue
            toast({ variant: "destructive", title: "خطأ", description: "لم يتم العثور على الرحلة المطلوبة للتعديل. سيتم بدء رحلة جديدة." });
             if (isMounted) {
                setCurrentTripDetails(null);
                setTransactions([]);
                setExchangeRates(loadRatesFromLocal());
                tripDetailsFormRef.current?.resetForm(null);
                setEditingTripId(null);
                 router.replace('/manage-trip', undefined);
                console.log("[ManageTripPage Debug] Trip to edit not found, defaulted to new trip.");
            }
          }
        } catch (error: any) {
          if (isMounted) {
            toast({ variant: "destructive", title: "خطأ في تحميل الرحلة", description: `حدث خطأ: ${error.message}. سيتم بدء رحلة جديدة.` });
            if (isMounted) {
                setCurrentTripDetails(null);
                setTransactions([]);
                setExchangeRates(loadRatesFromLocal());
                tripDetailsFormRef.current?.resetForm(null);
                setEditingTripId(null);
                 router.replace('/manage-trip', undefined);
                console.log("[ManageTripPage Debug] Exception loading edit trip, defaulted to new trip.");
            }
          }
        }
      } else { // New trip or guest mode
        if (isMounted) {
            console.log("[ManageTripPage Debug] Initializing for new trip or guest mode.");
            setCurrentTripDetails(null);
            setTransactions([]);
            setExchangeRates(loadRatesFromLocal());
            tripDetailsFormRef.current?.resetForm(null);
            setEditingTripId(null);
            if (!activeGuestMode && activeUser) { // Clear query params only for logged-in users starting a new trip
                 router.replace('/manage-trip', undefined);
            }
            console.log("[ManageTripPage Debug] New trip initialized.");
        }
      }
      
      if (isMounted) {
        setIsLoadingPage(false);
        console.log("[ManageTripPage Debug] Page loading finished.");
      }
    };

    initializePage();

    return () => { 
      isMounted = false;
      console.log("[ManageTripPage Debug] Component unmounted or useEffect re-ran.");
    };
  // Dependencies that should trigger re-initialization:
  // - searchParams: If the 'edit' param changes.
  // - propIsGuest: If the guest status from RootLayout changes.
  // router and toast are stable.
  }, [searchParams, propIsGuest, router, toast]);


  const handleTripDetailsUpdate = (details: TripDetailsFormData) => {
    setCurrentTripDetails(details);
  };

  const handleAddTransaction = (newTransaction: Transaction) => {
    setTransactions((prevTransactions) => 
      [...prevTransactions, newTransaction].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    toast({ title: "تم حذف المعاملة" });
  };

  const handleOpenEditModal = (transaction: Transaction) => {
    setTransactionToEdit(transaction);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setTransactionToEdit(null);
    setIsEditModalOpen(false);
  };

  const handleTransactionUpdated = (updatedTransaction: Transaction) => {
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
    if (transactions.length === 0 && !editingTripId && !isGuestMode) { // editingTripId can be null for new trips too
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
        // Delay hiding the report to allow print dialog to process
        setTimeout(() => {
            setReportDataForPrint(null);
        }, 1000); 
    }, 100); 
  };

  const handleRatesUpdate = (newRates: ExchangeRates) => {
    setExchangeRates(newRates);
    saveRatesToLocal(newRates);
    toast({ title: "تم تحديث أسعار الصرف محليًا لهذه الرحلة" });
  };

  const handleSaveFullTrip = async () => {
    if (isGuestMode) {
        toast({ variant: "destructive", title: "غير مسموح", description: "لحفظ الرحلات على الخادم، يرجى تسجيل الدخول أو إنشاء حساب." });
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
      return;
    }
    
    const currentEditingTripId = searchParams.get('edit'); // Re-fetch in case state is stale

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
        exchange_rates: exchangeRates 
    };

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
      
      // Reset state for a new trip
      setCurrentTripDetails(null);
      setTransactions([]);
      setExchangeRates(loadRatesFromLocal());
      tripDetailsFormRef.current?.resetForm(null);
      setEditingTripId(null);
      router.replace('/saved-trips'); // Go to saved trips page

    } catch (generalError: any) {
      toast({ variant: "destructive", title: "خطأ في حفظ/تحديث الرحلة", description: generalError.message || "حدث خطأ غير متوقع." });
    } finally {
      setIsSavingFullTrip(false);
    }
  };

  if (isLoadingPage) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><Loader2 className="ms-2 h-8 w-8 animate-spin text-primary" /> <p className="ps-3">جارٍ تحميل البيانات...</p></div>;
  }
  
  const saveButtonText = searchParams.get('edit') ? "تحديث الرحلة بالكامل والانتقال إلى السجل" : "حفظ الرحلة بالكامل والانتقال إلى السجل";
  const saveButtonIcon = searchParams.get('edit') ? <Edit className="ms-2 h-5 w-5" /> : <Save className="ms-2 h-5 w-5" />;

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-6 no-print">
        <Link href="/dashboard" passHref legacyBehavior>
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
        </div>
      </div>
      
      <TripDetailsForm ref={tripDetailsFormRef} onDetailsSubmit={handleTripDetailsUpdate} initialData={currentTripDetails} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start no-print">
        <div className="lg:col-span-1 space-y-8">
          <AddTransactionForm onTransactionAdded={handleAddTransaction} transactionToEdit={transactionToEdit} onTransactionUpdated={handleTransactionUpdated} onCancelEdit={handleCloseEditModal} />
          <BalanceSummary transactions={transactions} exchangeRates={exchangeRates} />
        </div>
        <div className="lg:col-span-2">
          <TransactionTable transactions={transactions} onDeleteTransaction={handleDeleteTransaction} onEditTransactionRequest={handleOpenEditModal} />
        </div>
      </div>

      {!isGuestMode && (
        <div className="mt-8 pt-6 border-t no-print">
            <Button onClick={handleSaveFullTrip} className="w-full md:w-auto" size="lg" disabled={isSavingFullTrip || (isGuestMode && !user) }> {/* Adjusted disabled condition slightly */}
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
            <AddTransactionForm transactionToEdit={transactionToEdit} onTransactionUpdated={handleTransactionUpdated} onCancelEdit={handleCloseEditModal} className="pt-4" />
          </DialogContent>
        </Dialog>
      )}

      <ExchangeRateManager isOpen={isExchangeRateManagerOpen} onOpenChange={setIsExchangeRateManagerOpen} currentRates={exchangeRates} onRatesUpdate={handleRatesUpdate} />

      <div className={cn("print-only", !reportDataForPrint && "hidden")}>
        {reportDataForPrint && <PrintableReport transactions={reportDataForPrint.transactions} exchangeRates={reportDataForPrint.exchangeRates} tripDetails={reportDataForPrint.tripDetails} />}
      </div>
    </div>
  );
}

