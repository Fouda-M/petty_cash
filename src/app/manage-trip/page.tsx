
"use client";

import * as React from "react";
<<<<<<< HEAD
import { useRouter, useSearchParams } from 'next/navigation';
=======
import { useRouter } from 'next/navigation';
>>>>>>> 7a8dd15ce28fb41b627e11674c98855546b6a5d1
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

<<<<<<< HEAD
interface ManageTripPageProps {
  isGuest?: boolean; // Prop to indicate guest mode
}
=======
const ALL_SAVED_TRIPS_KEY = "allSavedTrips_v1";
const ACTIVE_TRIP_DETAILS_KEY = "activeTripDetails_v1";
const EDITING_TRIP_ID_KEY = "editingTripId_v1";
const ACTIVE_TRANSACTIONS_KEY = "transactions_v1";
>>>>>>> 7a8dd15ce28fb41b627e11674c98855546b6a5d1

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
<<<<<<< HEAD
  const [exchangeRates, setExchangeRates] = React.useState<ExchangeRates>(() => ({ ...DEFAULT_EXCHANGE_RATES_TO_USD }));
  const [editingTripId, setEditingTripId] = React.useState<string | null>(null);

  const [isLoadingPage, setIsLoadingPage] = React.useState(true);
=======
  const [exchangeRates, setExchangeRates] = React.useState<ExchangeRates>(() => loadExchangeRates());
  const [editingTripId, setEditingTripId] = React.useState<string | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);
>>>>>>> 7a8dd15ce28fb41b627e11674c98855546b6a5d1
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [transactionToEdit, setTransactionToEdit] = React.useState<Transaction | null>(null);
  const [isExchangeRateManagerOpen, setIsExchangeRateManagerOpen] = React.useState(false);
  const [isSavingFullTrip, setIsSavingFullTrip] = React.useState(false);
<<<<<<< HEAD
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
=======

  const loadActiveOrDefaultTripData = React.useCallback(() => {
    console.log("[ManageTripPage Debug] Called loadActiveOrDefaultTripData");
    const activeDetailsJson = localStorage.getItem(ACTIVE_TRIP_DETAILS_KEY);
    if (activeDetailsJson) {
      try {
        const parsedDetails = JSON.parse(activeDetailsJson);
        setCurrentTripDetails({
          ...parsedDetails,
          tripStartDate: parsedDetails.tripStartDate ? new Date(parsedDetails.tripStartDate) : new Date(),
          tripEndDate: parsedDetails.tripEndDate ? new Date(parsedDetails.tripEndDate) : new Date(),
        });
      } catch (e) {
        console.error("[ManageTripPage Debug] Error parsing active trip details from localStorage:", e);
        setCurrentTripDetails(null);
        localStorage.removeItem(ACTIVE_TRIP_DETAILS_KEY);
      }
    } else {
       setCurrentTripDetails(null);
    }

    const savedTransactionsJson = localStorage.getItem(ACTIVE_TRANSACTIONS_KEY);
    console.log(`[ManageTripPage Debug] loadActiveOrDefaultTripData - savedTransactionsJson: ${savedTransactionsJson ? savedTransactionsJson.substring(0,100)+'...' : 'null'}`);
    if (savedTransactionsJson) {
      try {
        const parsedActiveTransactions = JSON.parse(savedTransactionsJson).map((t: any) => {
          let type = t.type;
          if (type === 'CUSTODY_HANDOVER') {
              console.warn(`[ManageTripPage Debug] Old transaction type "CUSTODY_HANDOVER" found for transaction ID "${t.id}" in active data. Correcting to CUSTODY_HANDOVER_OWNER.`);
              type = TransactionType.CUSTODY_HANDOVER_OWNER;
          }
          else if (!Object.values(TransactionType).includes(type as TransactionType)) {
              console.warn(`[ManageTripPage Debug] Invalid transaction type "${t.type}" found for transaction ID "${t.id}" in active data. Defaulting to EXPENSE.`);
              type = TransactionType.EXPENSE;
          }
          return {
            ...t,
            id: t.id || crypto.randomUUID(),
            date: new Date(t.date),
            type: type as TransactionType,
            amount: Number(t.amount) || 0
          };
        });
        console.log("[ManageTripPage Debug] loadActiveOrDefaultTripData - Parsed active transactions:", parsedActiveTransactions);
        setTransactions(parsedActiveTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } catch (e) {
        console.error("[ManageTripPage Debug] Error parsing active transactions from localStorage:", e);
        setTransactions([]);
        localStorage.removeItem(ACTIVE_TRANSACTIONS_KEY);
      }
    } else {
      console.log("[ManageTripPage Debug] loadActiveOrDefaultTripData - No active transactions found, setting to [].");
      setTransactions([]);
    }

    setExchangeRates(loadExchangeRates());
    setEditingTripId(null);
    console.log("[ManageTripPage Debug] Finished loadActiveOrDefaultTripData");
  }, []); // Empty dependency array makes this callback stable

  React.useEffect(() => {
    setIsLoading(true);
    console.log("[ManageTripPage Debug] Initial useEffect for data loading triggered.");
    let attemptedEditLoad = false;
    let successfullyLoadedEditTrip = false;

    try {
      const tripIdToEdit = localStorage.getItem(EDITING_TRIP_ID_KEY);
      console.log(`[ManageTripPage Debug] tripIdToEdit from localStorage: ${tripIdToEdit}`);

      if (tripIdToEdit) {
        attemptedEditLoad = true;
        console.log(`[ManageTripPage Debug] Attempting to load trip for editing. ID: ${tripIdToEdit}`);
        localStorage.removeItem(EDITING_TRIP_ID_KEY); // Remove immediately to prevent re-processing on refresh
        console.log(`[ManageTripPage Debug] Removed ${EDITING_TRIP_ID_KEY} from localStorage.`);

        const allSavedTripsJson = localStorage.getItem(ALL_SAVED_TRIPS_KEY);
        if (allSavedTripsJson) {
          const allSavedTrips = JSON.parse(allSavedTripsJson) as SavedTrip[];
          const tripToLoad = allSavedTrips.find(trip => trip.id === tripIdToEdit);

          console.log(`[ManageTripPage Debug] tripToLoad from allSavedTrips (ID: ${tripIdToEdit}):`, tripToLoad ? JSON.stringify(tripToLoad).substring(0,300)+'...' : "null");

          if (tripToLoad) {
            console.log("[ManageTripPage Debug] Found tripToLoad. Processing its data.");
            setCurrentTripDetails({
              ...tripToLoad.details,
              tripStartDate: new Date(tripToLoad.details.tripStartDate),
              tripEndDate: new Date(tripToLoad.details.tripEndDate),
            });

            const rawTransactionsFromTripToLoad = tripToLoad.transactions;
            console.log(`[ManageTripPage Debug] Raw transactions from tripToLoad (ID: ${tripIdToEdit}):`, JSON.stringify(rawTransactionsFromTripToLoad));

            const loadedTransactions = Array.isArray(rawTransactionsFromTripToLoad) ? rawTransactionsFromTripToLoad : [];
            console.log(`[ManageTripPage Debug] Ensured loadedTransactions is an array for trip ID ${tripIdToEdit}:`, JSON.stringify(loadedTransactions));

            const parsedTransactions = loadedTransactions.map((t: any) => {
              let type = t.type;
              if (type === 'CUSTODY_HANDOVER') {
                console.warn(`[ManageTripPage Debug] Old transaction type "CUSTODY_HANDOVER" found for transaction ID "${t.id}" in saved trip. Correcting to CUSTODY_HANDOVER_OWNER.`);
                type = TransactionType.CUSTODY_HANDOVER_OWNER;
              } else if (!Object.values(TransactionType).includes(type as TransactionType)) {
                console.warn(`[ManageTripPage Debug] Invalid transaction type "${t.type}" found for transaction ID "${t.id}" in saved trip. Defaulting to EXPENSE.`);
                type = TransactionType.EXPENSE;
              }
              return {
                ...t,
                id: t.id || crypto.randomUUID(),
                date: new Date(t.date),
                type: type as TransactionType,
                amount: Number(t.amount) || 0,
              };
            }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            console.log(`[ManageTripPage Debug] Parsed transactions to be set for editing trip ID ${tripIdToEdit}:`, JSON.stringify(parsedTransactions));
            setTransactions(parsedTransactions);
            setExchangeRates(tripToLoad.exchangeRates || loadExchangeRates());
            setEditingTripId(tripIdToEdit);
            toast({ title: "تم تحميل الرحلة للتعديل", description: `يتم الآن تعديل رحلة: ${tripToLoad.name}` });
            console.log(`[ManageTripPage Debug] Successfully loaded trip ID ${tripIdToEdit} for editing. State updated.`);
            successfullyLoadedEditTrip = true;
          } else {
            console.warn(`[ManageTripPage Debug] Trip ID ${tripIdToEdit} not found in allSavedTrips. Falling back.`);
            toast({ variant: "destructive", title: "خطأ", description: "لم يتم العثور على الرحلة المطلوبة للتعديل في السجل." });
            // loadActiveOrDefaultTripData(); // Do not call here if we intend to only load once
          }
        } else {
          console.warn(`[ManageTripPage Debug] ${ALL_SAVED_TRIPS_KEY} not found in localStorage. Falling back.`);
          toast({ variant: "destructive", title: "خطأ", description: "لا يوجد سجل للرحلات المحفوظة." });
          // loadActiveOrDefaultTripData(); // Do not call here
        }
      }

      // Only call loadActiveOrDefaultTripData if not successfully loaded an edit trip
      if (!successfullyLoadedEditTrip) {
        console.log("[ManageTripPage Debug] No tripIdToEdit found or edit load failed. Calling loadActiveOrDefaultTripData.");
        loadActiveOrDefaultTripData();
      }

    } catch (error) {
      console.error("[ManageTripPage Debug] Error during initial data loading in useEffect:", error);
      toast({ variant: "destructive", title: "خطأ في تهيئة بيانات الرحلة", description: String(error) });
      if (!successfullyLoadedEditTrip) { // If edit load failed or wasn't attempted, load defaults
          loadActiveOrDefaultTripData();
      }
      // Ensure EDITING_TRIP_ID_KEY is removed if an error occurred during its processing
      if (attemptedEditLoad && localStorage.getItem(EDITING_TRIP_ID_KEY)) {
        console.warn("[ManageTripPage Debug] Removing EDITING_TRIP_ID_KEY due to error during edit load processing.");
        localStorage.removeItem(EDITING_TRIP_ID_KEY);
      }
    } finally {
        setIsLoading(false);
        console.log("[ManageTripPage Debug] Initial useEffect for data loading finished. isLoading: false.");
    }
  }, []); // Changed dependency array to []
>>>>>>> 7a8dd15ce28fb41b627e11674c98855546b6a5d1

    initializePage();

<<<<<<< HEAD
    return () => { 
      isMounted = false;
      console.log("[ManageTripPage Debug] Component unmounted or useEffect re-ran.");
    };
  // Dependencies that should trigger re-initialization:
  // - searchParams: If the 'edit' param changes.
  // - propIsGuest: If the guest status from RootLayout changes.
  // router and toast are stable.
  }, [searchParams, propIsGuest, router, toast]);
=======
  React.useEffect(() => {
    if (!isLoading && !editingTripId) {
      console.log("[ManageTripPage Debug] Persisting active (non-editing) transactions to localStorage:", transactions);
      localStorage.setItem(ACTIVE_TRANSACTIONS_KEY, JSON.stringify(transactions));
    }
  }, [transactions, isLoading, editingTripId]);

  React.useEffect(() => {
    if (!isLoading && !editingTripId && currentTripDetails) {
      console.log("[ManageTripPage Debug] Persisting active (non-editing) trip details to localStorage:", currentTripDetails);
      localStorage.setItem(ACTIVE_TRIP_DETAILS_KEY, JSON.stringify(currentTripDetails));
    } else if (!isLoading && !editingTripId && !currentTripDetails) {
      console.log("[ManageTripPage Debug] Removing active (non-editing) trip details from localStorage.");
      localStorage.removeItem(ACTIVE_TRIP_DETAILS_KEY);
    }
  }, [currentTripDetails, isLoading, editingTripId]);
>>>>>>> 7a8dd15ce28fb41b627e11674c98855546b6a5d1


  const handleTripDetailsUpdate = (details: TripDetailsFormData) => {
    console.log("[ManageTripPage Debug] handleTripDetailsUpdate called with:", details);
    setCurrentTripDetails(details);
  };

  const handleAddTransaction = (newTransaction: Transaction) => {
<<<<<<< HEAD
    setTransactions((prevTransactions) => 
=======
     console.log("[ManageTripPage Debug] handleAddTransaction called with:", newTransaction);
    setTransactions((prevTransactions) =>
>>>>>>> 7a8dd15ce28fb41b627e11674c98855546b6a5d1
      [...prevTransactions, newTransaction].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
<<<<<<< HEAD
    setTransactions(prev => 
      prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
=======
    console.log("[ManageTripPage Debug] handleTransactionUpdated called with:", updatedTransaction);
    setTransactions(prev =>
      prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
>>>>>>> 7a8dd15ce28fb41b627e11674c98855546b6a5d1
    );
    handleCloseEditModal();
  };

  const handlePrint = async () => {
<<<<<<< HEAD
    const latestValidatedDetails = await tripDetailsFormRef.current?.validateAndGetData();
    if (!latestValidatedDetails) {
      toast({ variant: "destructive", title: "بيانات الرحلة غير صالحة", description: "يرجى مراجعة وتصحيح بيانات الرحلة في النموذج." });
      return;
=======
    console.log("[ManageTripPage Debug] handlePrint called.");
    const element = document.querySelector(".print-only");
    if (element && typeof window !== 'undefined') {
      try {
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default;

        let detailsForPrint: TripDetailsFormData | null = currentTripDetails;
        // Try to get latest validated data from form for printing
        if (tripDetailsFormRef.current) {
            const validatedDataFromForm = await tripDetailsFormRef.current.validateAndGetData();
            if (validatedDataFromForm) {
                detailsForPrint = validatedDataFromForm;
                console.log("[ManageTripPage Debug] Using validated trip details from form for print:", detailsForPrint);
            } else {
                 console.warn("[ManageTripPage Debug] Trip details form validation failed for print, using currentTripDetails state.");
            }
        }


        if (!detailsForPrint) {
            toast({ variant: "destructive", title: "بيانات الرحلة غير كاملة للطباعة" });
            console.error("[ManageTripPage Debug] Cannot print, trip details are null or invalid.");
            return;
        }

        // Temporarily set currentTripDetails for PrintableReport if form data is fresher
        const originalDetailsInState = currentTripDetails;
        let detailsChangedForPrint = false;
        if (detailsForPrint !== currentTripDetails) {
            setCurrentTripDetails(detailsForPrint);
            detailsChangedForPrint = true;
            // Wait for state to propagate to PrintableReport
            await new Promise(resolve => setTimeout(resolve, 0));
        }


        html2pdf()
          .set({ margin: 0.5, filename: "transactions-report.pdf", image: { type: "jpeg", quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, logging: false }, jsPDF: { unit: "in", format: "a4", orientation: "portrait" }})
          .from(element)
          .save()
          .then(() => {
             console.log("[ManageTripPage Debug] PDF generation successful.");
             if (detailsChangedForPrint) {
                setCurrentTripDetails(originalDetailsInState); // Restore original state
            }
          }).catch((pdfError) => {
            console.error("[ManageTripPage Debug] Error during PDF generation process:", pdfError);
            if (detailsChangedForPrint) {
                setCurrentTripDetails(originalDetailsInState); // Restore original state on error too
            }
          });
      } catch (error) {
        console.error("[ManageTripPage Debug] Error in handlePrint:", error);
        toast({ variant: "destructive", title: "خطأ في إنشاء PDF" });
      }
    } else {
        console.warn("[ManageTripPage Debug] Printable element not found or window is undefined.");
>>>>>>> 7a8dd15ce28fb41b627e11674c98855546b6a5d1
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
<<<<<<< HEAD
=======
    console.log("[ManageTripPage Debug] handleRatesUpdate called with:", newRates);
    saveExchangeRates(newRates);
>>>>>>> 7a8dd15ce28fb41b627e11674c98855546b6a5d1
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
<<<<<<< HEAD
=======
    console.log("[ManageTripPage Debug] handleSaveFullTrip called. EditingTripId:", editingTripId);

>>>>>>> 7a8dd15ce28fb41b627e11674c98855546b6a5d1
    const validatedTripDetails = await tripDetailsFormRef.current?.validateAndGetData();
    if (!validatedTripDetails) {
      toast({ variant: "destructive", title: "بيانات الرحلة غير مكتملة أو غير صالحة", description: "يرجى إكمال وتصحيح بيانات الرحلة في النموذج أعلاه." });
      setIsSavingFullTrip(false);
      console.error("[ManageTripPage Debug] Trip details validation failed in handleSaveFullTrip.");
      return;
    }
<<<<<<< HEAD
    
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
=======

    if (transactions.length === 0 && !editingTripId) {
        toast({
            variant: "destructive",
            title: "لا توجد معاملات",
            description: "يرجى إضافة معاملة واحدة على الأقل قبل حفظ رحلة جديدة.",
        });
        setIsSavingFullTrip(false);
        console.warn("[ManageTripPage Debug] Attempted to save new trip with no transactions.");
        return;
    }

    const tripName = `${validatedTripDetails.driverName} - ${validatedTripDetails.cityName || validatedTripDetails.countryName} - ${format(new Date(validatedTripDetails.tripStartDate), 'dd/MM/yyyy')}`;
    console.log(`[ManageTripPage Debug] Generated trip name: ${tripName}`);

    let originalCreatedAt = new Date().toISOString();
    if (editingTripId) {
        const allSavedTripsJsonForDate = localStorage.getItem(ALL_SAVED_TRIPS_KEY);
        if (allSavedTripsJsonForDate) {
            try {
                const allSavedTripsForDate = JSON.parse(allSavedTripsJsonForDate) as SavedTrip[];
                const existingTrip = allSavedTripsForDate.find(t => t.id === editingTripId);
                if (existingTrip && existingTrip.createdAt) {
                    originalCreatedAt = existingTrip.createdAt;
                }
            } catch(e) { console.error("[ManageTripPage Debug] Error parsing saved trips for created date", e); }
        }
    }

    const tripDataToSave: SavedTrip = {
      id: editingTripId || crypto.randomUUID(),
      name: tripName,
      details: validatedTripDetails,
      transactions: transactions,
      exchangeRates: exchangeRates,
      createdAt: editingTripId ? originalCreatedAt : new Date().toISOString(),
      ...(editingTripId && { updatedAt: new Date().toISOString() })
>>>>>>> 7a8dd15ce28fb41b627e11674c98855546b6a5d1
    };
    console.log("[ManageTripPage Debug] Trip data to save:", JSON.stringify(tripDataToSave).substring(0,300)+'...');

    try {
<<<<<<< HEAD
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
=======
      const existingTripsJson = localStorage.getItem(ALL_SAVED_TRIPS_KEY);
      let existingTrips: SavedTrip[] = existingTripsJson ? JSON.parse(existingTripsJson) : [];

      if (editingTripId) {
        existingTrips = existingTrips.map(trip => trip.id === editingTripId ? tripDataToSave : trip);
        toast({
          title: "تم تحديث الرحلة بنجاح!",
          description: `تم تحديث رحلة "${tripName}".`,
        });
        console.log(`[ManageTripPage Debug] Updated trip ID: ${editingTripId}`);
      } else {
        existingTrips.push(tripDataToSave);
        toast({
          title: "تم حفظ الرحلة بنجاح!",
          description: `تم حفظ رحلة "${tripName}".`,
        });
        console.log(`[ManageTripPage Debug] Saved new trip ID: ${tripDataToSave.id}`);
      }

      localStorage.setItem(ALL_SAVED_TRIPS_KEY, JSON.stringify(existingTrips));
      console.log(`[ManageTripPage Debug] ${ALL_SAVED_TRIPS_KEY} updated in localStorage.`);

      localStorage.removeItem(ACTIVE_TRANSACTIONS_KEY);
      localStorage.removeItem(ACTIVE_TRIP_DETAILS_KEY);
      saveExchangeRates({...DEFAULT_EXCHANGE_RATES_TO_USD}); // Reset global exchange rates
      console.log("[ManageTripPage Debug] Cleared active session data and reset exchange rates to default.");

      setTransactions([]);
      setCurrentTripDetails(null);
      setExchangeRates(loadExchangeRates()); // Load default rates into state
      setEditingTripId(null);
      console.log("[ManageTripPage Debug] Component state reset for new trip.");

      router.push('/saved-trips');

    } catch (error) {
      console.error("[ManageTripPage Debug] Failed to save/update full trip:", error);
      toast({ variant: "destructive", title: "خطأ في حفظ/تحديث الرحلة", description: "لم يتم حفظ/تحديث الرحلة بالكامل." });
>>>>>>> 7a8dd15ce28fb41b627e11674c98855546b6a5d1
    } finally {
      setIsSavingFullTrip(false);
    }
  };

<<<<<<< HEAD
  if (isLoadingPage) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><Loader2 className="ms-2 h-8 w-8 animate-spin text-primary" /> <p className="ps-3">جارٍ تحميل البيانات...</p></div>;
  }
  
  const saveButtonText = searchParams.get('edit') ? "تحديث الرحلة بالكامل والانتقال إلى السجل" : "حفظ الرحلة بالكامل والانتقال إلى السجل";
  const saveButtonIcon = searchParams.get('edit') ? <Edit className="ms-2 h-5 w-5" /> : <Save className="ms-2 h-5 w-5" />;
=======

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="ms-2 h-8 w-8 animate-spin text-primary" /> <p className="ms-3">جارٍ تحميل البيانات...</p></div>;
  }

  const saveButtonText = editingTripId ? "تحديث الرحلة بالكامل والانتقال إلى السجل" : "حفظ الرحلة بالكامل والانتقال إلى السجل";
  const saveButtonIcon = editingTripId ? <Edit className="ms-2 h-5 w-5" /> : <Save className="ms-2 h-5 w-5" />;

>>>>>>> 7a8dd15ce28fb41b627e11674c98855546b6a5d1

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
<<<<<<< HEAD
      
      <TripDetailsForm ref={tripDetailsFormRef} onDetailsSubmit={handleTripDetailsUpdate} initialData={currentTripDetails} />
      
=======

      <TripDetailsForm
        ref={tripDetailsFormRef}
        onDetailsSubmit={handleTripDetailsUpdate}
        initialData={currentTripDetails}
      />

>>>>>>> 7a8dd15ce28fb41b627e11674c98855546b6a5d1
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start no-print">
        <div className="lg:col-span-1 space-y-8">
          <AddTransactionForm onTransactionAdded={handleAddTransaction} transactionToEdit={transactionToEdit} onTransactionUpdated={handleTransactionUpdated} onCancelEdit={handleCloseEditModal} />
          <BalanceSummary transactions={transactions} exchangeRates={exchangeRates} />
        </div>
        <div className="lg:col-span-2">
          <TransactionTable transactions={transactions} onDeleteTransaction={handleDeleteTransaction} onEditTransactionRequest={handleOpenEditModal} />
        </div>
      </div>

<<<<<<< HEAD
      {!isGuestMode && (
        <div className="mt-8 pt-6 border-t no-print">
            <Button onClick={handleSaveFullTrip} className="w-full md:w-auto" size="lg" disabled={isSavingFullTrip || (isGuestMode && !user) }> {/* Adjusted disabled condition slightly */}
            {isSavingFullTrip && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
            {saveButtonIcon}
            {saveButtonText}
            </Button>
        </div>
      )}
=======
      <div className="mt-8 pt-6 border-t no-print">
        <Button
          onClick={handleSaveFullTrip}
          className="w-full md:w-auto"
          size="lg"
          disabled={isSavingFullTrip}
        >
          {isSavingFullTrip && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
          {saveButtonIcon}
          {saveButtonText}
        </Button>
      </div>
>>>>>>> 7a8dd15ce28fb41b627e11674c98855546b6a5d1

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

<<<<<<< HEAD
      <div className={cn("print-only", !reportDataForPrint && "hidden")}>
        {reportDataForPrint && <PrintableReport transactions={reportDataForPrint.transactions} exchangeRates={reportDataForPrint.exchangeRates} tripDetails={reportDataForPrint.tripDetails} />}
=======
      <div className="print-only hidden">
         <PrintableReport
            transactions={transactions}
            exchangeRates={exchangeRates}
            tripDetails={currentTripDetails}
        />
>>>>>>> 7a8dd15ce28fb41b627e11674c98855546b6a5d1
      </div>
    </div>
  );
}

<<<<<<< HEAD
=======
    
>>>>>>> 7a8dd15ce28fb41b627e11674c98855546b6a5d1
