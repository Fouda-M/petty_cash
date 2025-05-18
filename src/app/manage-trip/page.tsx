
"use client";

import * as React from "react";
import { useRouter } from 'next/navigation'; 
import { format } from 'date-fns'; 
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import TransactionTable from "@/components/transactions/TransactionTable";
import BalanceSummary from "@/components/transactions/BalanceSummary";
import PrintableReport from "@/components/print/PrintableReport";
import TripDetailsForm, { type TripDetailsFormRef } from "@/components/trip/TripDetailsForm";
import type { Transaction, ExchangeRates, SavedTrip } from "@/types";
import type { TripDetailsFormData } from "@/lib/schemas";
import { TransactionType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Printer, Settings, ArrowRight, Save, ListChecks, Loader2, Edit } from "lucide-react";
import { loadExchangeRates, saveExchangeRates, DEFAULT_EXCHANGE_RATES_TO_USD } from "@/lib/exchangeRates";
import ExchangeRateManager from "@/components/settings/ExchangeRateManager";
import Link from "next/link";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const ALL_SAVED_TRIPS_KEY = "allSavedTrips_v1";
const ACTIVE_TRIP_DETAILS_KEY = "activeTripDetails_v1";
const EDITING_TRIP_ID_KEY = "editingTripId_v1"; 
const ACTIVE_TRANSACTIONS_KEY = "transactions_v1"; 

export default function ManageTripPage() {
  const router = useRouter();
  const { toast } = useToast();
  const tripDetailsFormRef = React.useRef<TripDetailsFormRef>(null);

  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [currentTripDetails, setCurrentTripDetails] = React.useState<TripDetailsFormData | null>(null);
  const [exchangeRates, setExchangeRates] = React.useState<ExchangeRates>(() => loadExchangeRates());
  const [editingTripId, setEditingTripId] = React.useState<string | null>(null); 
  
  const [isLoading, setIsLoading] = React.useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [transactionToEdit, setTransactionToEdit] = React.useState<Transaction | null>(null);
  const [isExchangeRateManagerOpen, setIsExchangeRateManagerOpen] = React.useState(false);
  const [isSavingFullTrip, setIsSavingFullTrip] = React.useState(false);

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
  }, []); // Removed toast from dependency array as it's not called inside

  React.useEffect(() => {
    setIsLoading(true);
    console.log("[ManageTripPage Debug] Initial useEffect for data loading triggered.");
    let attemptedEditLoad = false;

    try {
      const tripIdToEdit = localStorage.getItem(EDITING_TRIP_ID_KEY);
      console.log(`[ManageTripPage Debug] tripIdToEdit from localStorage: ${tripIdToEdit}`);

      if (tripIdToEdit) {
        attemptedEditLoad = true;
        console.log(`[ManageTripPage Debug] Attempting to load trip for editing. ID: ${tripIdToEdit}`);
        localStorage.removeItem(EDITING_TRIP_ID_KEY); // Remove immediately after reading
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
            
          } else {
            console.warn(`[ManageTripPage Debug] Trip ID ${tripIdToEdit} not found in allSavedTrips. Falling back.`);
            toast({ variant: "destructive", title: "خطأ", description: "لم يتم العثور على الرحلة المطلوبة للتعديل في السجل." });
            loadActiveOrDefaultTripData(); 
          }
        } else {
          console.warn(`[ManageTripPage Debug] ${ALL_SAVED_TRIPS_KEY} not found in localStorage. Falling back.`);
          toast({ variant: "destructive", title: "خطأ", description: "لا يوجد سجل للرحلات المحفوظة." });
          loadActiveOrDefaultTripData();
        }
      } else {
        console.log("[ManageTripPage Debug] No tripIdToEdit found. Calling loadActiveOrDefaultTripData.");
        loadActiveOrDefaultTripData();
      }

    } catch (error) {
      console.error("[ManageTripPage Debug] Error during initial data loading in useEffect:", error);
      toast({ variant: "destructive", title: "خطأ في تهيئة بيانات الرحلة", description: String(error) });
      loadActiveOrDefaultTripData(); 
      if (attemptedEditLoad && localStorage.getItem(EDITING_TRIP_ID_KEY)) { 
        console.warn("[ManageTripPage Debug] Removing EDITING_TRIP_ID_KEY due to error during edit load.");
        localStorage.removeItem(EDITING_TRIP_ID_KEY); 
      }
    } finally {
        setIsLoading(false);
        console.log("[ManageTripPage Debug] Initial useEffect for data loading finished. isLoading: false.");
    }
  }, [loadActiveOrDefaultTripData, toast]); 


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


  const handleTripDetailsUpdate = (details: TripDetailsFormData) => {
    console.log("[ManageTripPage Debug] handleTripDetailsUpdate called with:", details);
    setCurrentTripDetails(details);
  };

  const handleAddTransaction = (newTransaction: Transaction) => {
     console.log("[ManageTripPage Debug] handleAddTransaction called with:", newTransaction);
    setTransactions((prevTransactions) =>
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
    console.log("[ManageTripPage Debug] handleTransactionUpdated called with:", updatedTransaction);
    setTransactions(prev =>
      prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
    handleCloseEditModal();
  };

  const handlePrint = async () => {
    console.log("[ManageTripPage Debug] handlePrint called.");
    const element = document.querySelector(".print-only");
    if (element && typeof window !== 'undefined') {
      try {
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default;
        
        let detailsForPrint: TripDetailsFormData | null = currentTripDetails;
        if (tripDetailsFormRef.current) {
            const validatedData = await tripDetailsFormRef.current.validateAndGetData();
            if (validatedData) {
                detailsForPrint = validatedData;
                console.log("[ManageTripPage Debug] Using validated trip details for print:", detailsForPrint);
            } else {
                 console.warn("[ManageTripPage Debug] Trip details form validation failed for print.");
            }
        }

        if (!detailsForPrint) {
            toast({ variant: "destructive", title: "بيانات الرحلة غير كاملة للطباعة" });
            console.error("[ManageTripPage Debug] Cannot print, trip details are null or invalid.");
            return;
        }
        
        const originalDetails = currentTripDetails;
        if (detailsForPrint !== currentTripDetails) {
            setCurrentTripDetails(detailsForPrint);
            await new Promise(resolve => setTimeout(resolve, 0)); 
        }

        html2pdf()
          .set({ margin: 0.5, filename: "transactions-report.pdf", image: { type: "jpeg", quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, logging: false }, jsPDF: { unit: "in", format: "a4", orientation: "portrait" }})
          .from(element)
          .save()
          .then(() => {
             console.log("[ManageTripPage Debug] PDF generation successful.");
             if (detailsForPrint !== originalDetails) { 
                setCurrentTripDetails(originalDetails);
            }
          }).catch((pdfError) => {
            console.error("[ManageTripPage Debug] Error during PDF generation process:", pdfError);
            if (detailsForPrint !== originalDetails) { 
                setCurrentTripDetails(originalDetails);
            }
          });
      } catch (error) {
        console.error("[ManageTripPage Debug] Error in handlePrint:", error);
        toast({ variant: "destructive", title: "خطأ في إنشاء PDF" });
      }
    } else {
        console.warn("[ManageTripPage Debug] Printable element not found or window is undefined.");
    }
  };

  const handleRatesUpdate = (newRates: ExchangeRates) => {
    console.log("[ManageTripPage Debug] handleRatesUpdate called with:", newRates);
    saveExchangeRates(newRates); 
    setExchangeRates(newRates); 
    toast({ title: "تم تحديث أسعار الصرف" });
  };

  const handleSaveFullTrip = async () => {
    setIsSavingFullTrip(true);
    console.log("[ManageTripPage Debug] handleSaveFullTrip called. EditingTripId:", editingTripId);

    const validatedTripDetails = await tripDetailsFormRef.current?.validateAndGetData();

    if (!validatedTripDetails) {
      toast({
        variant: "destructive",
        title: "بيانات الرحلة غير مكتملة أو غير صالحة",
        description: "يرجى إكمال وتصحيح بيانات الرحلة في النموذج أعلاه.",
      });
      setIsSavingFullTrip(false);
      console.error("[ManageTripPage Debug] Trip details validation failed in handleSaveFullTrip.");
      return;
    }
    
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
    };
    console.log("[ManageTripPage Debug] Trip data to save:", JSON.stringify(tripDataToSave).substring(0,300)+'...');


    try {
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
    } finally {
      setIsSavingFullTrip(false);
    }
  };


  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="ms-2 h-8 w-8 animate-spin text-primary" /> <p className="ms-3">جارٍ تحميل البيانات...</p></div>;
  }
  
  const saveButtonText = editingTripId ? "تحديث الرحلة بالكامل والانتقال إلى السجل" : "حفظ الرحلة بالكامل والانتقال إلى السجل";
  const saveButtonIcon = editingTripId ? <Edit className="ms-2 h-5 w-5" /> : <Save className="ms-2 h-5 w-5" />;


  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-6 no-print">
        <Link href="/" passHref legacyBehavior>
          <Button variant="outline">
            <ArrowRight className="ms-2 h-4 w-4" />
            العودة إلى الرئيسية
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
          <Button onClick={() => router.push('/saved-trips')} variant="outline">
            <ListChecks className="ms-2 h-4 w-4" />
            عرض الرحلات المحفوظة
          </Button>
        </div>
      </div>
      
      <TripDetailsForm 
        ref={tripDetailsFormRef}
        onDetailsSubmit={handleTripDetailsUpdate} 
        initialData={currentTripDetails} 
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start no-print">
        <div className="lg:col-span-1 space-y-8">
          <AddTransactionForm onTransactionAdded={handleAddTransaction} />
          <BalanceSummary transactions={transactions} exchangeRates={exchangeRates} />
        </div>
        <div className="lg:col-span-2">
          <TransactionTable
            transactions={transactions}
            onDeleteTransaction={handleDeleteTransaction}
            onEditTransactionRequest={handleOpenEditModal}
          />
        </div>
      </div>

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

      {isEditModalOpen && transactionToEdit && (
        <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => !isOpen && handleCloseEditModal()}>
          <DialogContent className="sm:max-w-[425px] md:max-w-[600px] no-print">
            <DialogHeader>
              <DialogTitle>تعديل المعاملة</DialogTitle>
              <DialogDescription> قم بتحديث تفاصيل معاملتك هنا. انقر على حفظ عند الانتهاء. </DialogDescription>
            </DialogHeader>
            <AddTransactionForm
              transactionToEdit={transactionToEdit}
              onTransactionUpdated={handleTransactionUpdated}
              onCancelEdit={handleCloseEditModal}
              className="pt-4"
            />
          </DialogContent>
        </Dialog>
      )}

      <ExchangeRateManager
        isOpen={isExchangeRateManagerOpen}
        onOpenChange={setIsExchangeRateManagerOpen}
        currentRates={exchangeRates}
        onRatesUpdate={handleRatesUpdate}
      />

      <div className="print-only hidden">
         <PrintableReport 
            transactions={transactions} 
            exchangeRates={exchangeRates} 
            tripDetails={currentTripDetails} 
        />
      </div>
    </div>
  );
}

