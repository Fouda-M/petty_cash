
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

  const [user, setUser] = React.useState<User | null>(null);
  const [isGuestMode, setIsGuestMode] = React.useState(false);
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

  const loadNewTripDefaults = React.useCallback(() => {
    console.log("[ManageTripPage Debug] loadNewTripDefaults called");
    setCurrentTripDetails(null);
    setTransactions([]);
    setExchangeRates(loadRatesFromLocal()); // Load from local storage or defaults
    tripDetailsFormRef.current?.resetForm(null);
    setEditingTripId(null);
    if (!isGuestMode) router.replace('/manage-trip', undefined); // Clear query params for non-guests
    console.log("[ManageTripPage Debug] Initialized as a new trip.");
  }, [isGuestMode, router]);

  React.useEffect(() => {
    let isMounted = true;
    setIsLoadingPage(true);

    const determineGuestStatusAndUser = async () => {
      const guestStatusFromStorage = sessionStorage.getItem('isGuest') === 'true';
      if (propIsGuest !== undefined) {
        setIsGuestMode(propIsGuest);
      } else {
        setIsGuestMode(guestStatusFromStorage);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && !guestStatusFromStorage) { // If a user session exists and not forced guest
        setUser(session.user);
        if (isGuestMode) setIsGuestMode(false); // Correct guest mode if user is actually logged in
      } else if (guestStatusFromStorage) {
        setUser(null); // Ensure user is null in guest mode
      } else { // No user, not explicitly guest -> probably needs login
        if (isMounted) {
            toast({ title: "غير مصرح به", description: "يرجى تسجيل الدخول أو الاستمرار كضيف.", variant: "destructive" });
            router.push('/');
        }
        return false; // Indicate that further loading should stop
      }
      return true; // Indicate that user/guest status is determined
    };

    const initializePageData = async (isCurrentlyGuest: boolean, currentUser: User | null) => {
      const tripIdToEditParam = searchParams.get('edit');
      
      if (tripIdToEditParam && !isCurrentlyGuest && currentUser) {
        setEditingTripId(tripIdToEditParam);
        try {
          const { data: tripToLoad, error: fetchError } = await supabase
            .from('trips')
            .select('*')
            .eq('id', tripIdToEditParam)
            .eq('user_id', currentUser.id)
            .single();

          if (fetchError && isMounted) {
            toast({ variant: "destructive", title: "خطأ في تحميل الرحلة", description: `لم يتم العثور على الرحلة أو حدث خطأ: ${fetchError.message}. سيتم بدء رحلة جديدة.` });
            loadNewTripDefaults();
          } else if (tripToLoad && isMounted) {
            const tripData = tripToLoad as any;
            const details = tripData.details;
            if (details && details.tripStartDate && details.tripEndDate) {
              const loadedTripDetails: TripDetailsFormData = { ...details, tripStartDate: new Date(details.tripStartDate), tripEndDate: new Date(details.tripEndDate) };
              setCurrentTripDetails(loadedTripDetails);
              tripDetailsFormRef.current?.resetForm(loadedTripDetails);
            }
            const rawTransactions = Array.isArray(tripData.transactions) ? tripData.transactions : [];
            const parsedTransactions = rawTransactions.map((t: any) => ({ ...t, id: t.id || crypto.randomUUID(), date: new Date(t.date), amount: Number(t.amount) || 0, type: t.type as TransactionType })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setTransactions(parsedTransactions);
            setExchangeRates(tripData.exchange_rates || loadRatesFromLocal());
            toast({ title: "تم تحميل الرحلة للتعديل", description: `يتم الآن تعديل رحلة: ${tripData.name || 'غير مسماة'}` });
          } else if (isMounted) {
            toast({ variant: "destructive", title: "خطأ", description: "لم يتم العثور على الرحلة المطلوبة للتعديل. سيتم بدء رحلة جديدة." });
            loadNewTripDefaults();
          }
        } catch (error: any) {
          if (isMounted) {
            toast({ variant: "destructive", title: "خطأ في تحميل الرحلة", description: `حدث خطأ: ${error.message}. سيتم بدء رحلة جديدة.` });
            loadNewTripDefaults();
          }
        }
      } else { // New trip or guest mode
        loadNewTripDefaults();
      }
      if (isMounted) setIsLoadingPage(false);
    };
    
    determineGuestStatusAndUser().then(canProceed => {
        if (isMounted && canProceed) {
            // Access isGuestMode and user from state which should be set by determineGuestStatusAndUser
            // This is a bit tricky as state updates are async. Let's use the direct values from determine...
            const guestStatus = propIsGuest !== undefined ? propIsGuest : sessionStorage.getItem('isGuest') === 'true';
            const activeUser = user; // user state from outer scope, should be updated by onAuthStateChange
            initializePageData(guestStatus, activeUser);
        } else if (isMounted && !canProceed) {
             setIsLoadingPage(false); // Stop loading if user check fails
        }
    });


    return () => { isMounted = false; };
  }, [searchParams, router, toast, loadNewTripDefaults, propIsGuest, user]); // Added user to deps for re-check

  const handleTripDetailsUpdate = (details: TripDetailsFormData) => {
    setCurrentTripDetails(details);
    // For guests or non-server saved trips, save active details to localStorage
    if (isGuestMode || !editingTripId) {
        localStorage.setItem("activeTripDetails_v2", JSON.stringify(details));
    }
  };

  const handleAddTransaction = (newTransaction: Transaction) => {
    setTransactions((prevTransactions) => {
      const updated = [...prevTransactions, newTransaction].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (isGuestMode || !editingTripId) {
        localStorage.setItem("activeTransactions_v2", JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => {
        const updated = prev.filter(t => t.id !== id);
        if (isGuestMode || !editingTripId) {
            localStorage.setItem("activeTransactions_v2", JSON.stringify(updated));
        }
        return updated;
    });
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
    setTransactions(prev => {
      const updated = prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (isGuestMode || !editingTripId) {
        localStorage.setItem("activeTransactions_v2", JSON.stringify(updated));
      }
      return updated;
    });
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
    setReportDataForPrint({ tripDetails: latestValidatedDetails, transactions, exchangeRates });
    setTimeout(() => {
      if (typeof window !== "undefined") {
        window.print();
      }
      setTimeout(() => {
        setReportDataForPrint(null);
      }, 1000);
    }, 100);
  };

  const handleRatesUpdate = (newRates: ExchangeRates) => {
    setExchangeRates(newRates);
    saveRatesToLocal(newRates); // Save to local storage for persistence for current session/guest
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
    if (!editingTripId && transactions.length === 0) {
      toast({ variant: "destructive", title: "لا توجد معاملات", description: "يرجى إضافة معاملة واحدة على الأقل قبل حفظ رحلة جديدة." });
      setIsSavingFullTrip(false);
      return;
    }

    const tripName = `${validatedTripDetails.driverName} - ${validatedTripDetails.cityName || validatedTripDetails.countryName} - ${format(validatedTripDetails.tripStartDate, 'dd/MM/yyyy')}`;
    const detailsForDb = { ...validatedTripDetails, tripStartDate: validatedTripDetails.tripStartDate.toISOString(), tripEndDate: validatedTripDetails.tripEndDate.toISOString() };
    const transactionsForDb = transactions.map(t => ({ ...t, date: t.date.toISOString() }));
    const tripDataPayload = { user_id: user.id, name: tripName, details: detailsForDb, transactions: transactionsForDb, exchange_rates: exchangeRates };

    try {
      let error;
      if (editingTripId) {
        const { error: updateError } = await supabase.from('trips').update({ ...tripDataPayload, updated_at: new Date().toISOString() }).eq('id', editingTripId).eq('user_id', user.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('trips').insert({ ...tripDataPayload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select().single();
        error = insertError;
      }
      if (error) throw error;
      toast({ title: editingTripId ? "تم تحديث الرحلة بنجاح!" : "تم حفظ الرحلة بنجاح!", description: `تم ${editingTripId ? 'تحديث' : 'حفظ'} رحلة "${tripName}".` });
      
      // Clear local storage for active trip data after successful save to server
      localStorage.removeItem("activeTripDetails_v2");
      localStorage.removeItem("activeTransactions_v2");
      // Do not clear general exchange rates from localStorage here, user might want to keep them.

      loadNewTripDefaults();
      router.push('/saved-trips');
    } catch (generalError: any) {
      toast({ variant: "destructive", title: "خطأ في حفظ/تحديث الرحلة", description: generalError.message || "حدث خطأ غير متوقع." });
    } finally {
      setIsSavingFullTrip(false);
    }
  };

  if (isLoadingPage) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="ms-2 h-8 w-8 animate-spin text-primary" /> <p className="ps-3">جارٍ تحميل البيانات...</p></div>;
  }
  
  const saveButtonText = editingTripId ? "تحديث الرحلة بالكامل والانتقال إلى السجل" : "حفظ الرحلة بالكامل والانتقال إلى السجل";
  const saveButtonIcon = editingTripId ? <Edit className="ms-2 h-5 w-5" /> : <Save className="ms-2 h-5 w-5" />;

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
            <Button onClick={handleSaveFullTrip} className="w-full md:w-auto" size="lg" disabled={isSavingFullTrip || isGuestMode}>
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
