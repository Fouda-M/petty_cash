
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
const ACTIVE_TRANSACTIONS_KEY = "transactions"; // Key for active, non-saved trip transactions

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


  React.useEffect(() => {
    setIsLoading(true);
    let attemptedEditLoad = false; // Flag to know if we tried to load a trip for editing

    try {
      const tripIdToEdit = localStorage.getItem(EDITING_TRIP_ID_KEY);

      if (tripIdToEdit) {
        attemptedEditLoad = true;
        localStorage.removeItem(EDITING_TRIP_ID_KEY); // Remove key once read, before async ops

        const allSavedTripsJson = localStorage.getItem(ALL_SAVED_TRIPS_KEY);
        if (allSavedTripsJson) {
          const allSavedTrips = JSON.parse(allSavedTripsJson) as SavedTrip[];
          const tripToLoad = allSavedTrips.find(trip => trip.id === tripIdToEdit);

          if (tripToLoad) {
            // Successfully found the trip to load
            setCurrentTripDetails({
              ...tripToLoad.details,
              tripStartDate: new Date(tripToLoad.details.tripStartDate),
              tripEndDate: new Date(tripToLoad.details.tripEndDate),
            });
            
            const loadedTransactions = Array.isArray(tripToLoad.transactions) ? tripToLoad.transactions : [];
            const parsedTransactions = loadedTransactions.map((t: any) => {
              let type = t.type;
              if (type === 'CUSTODY_HANDOVER') {
                console.warn(`Old transaction type "CUSTODY_HANDOVER" found for transaction ID "${t.id}" in saved trip. Correcting to CUSTODY_HANDOVER_OWNER.`);
                type = TransactionType.CUSTODY_HANDOVER_OWNER;
              } else if (!Object.values(TransactionType).includes(type as TransactionType)) {
                console.warn(`Invalid transaction type "${t.type}" found for transaction ID "${t.id}" in saved trip. Defaulting to EXPENSE.`);
                type = TransactionType.EXPENSE;
              }
              return {
                ...t,
                id: t.id || crypto.randomUUID(),
                date: new Date(t.date), // Ensure date is Date object
                type: type as TransactionType, 
                amount: Number(t.amount) || 0, // Ensure amount is a number
              };
            }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            setTransactions(parsedTransactions);
            setExchangeRates(tripToLoad.exchangeRates);
            setEditingTripId(tripIdToEdit); 
            toast({ title: "تم تحميل الرحلة للتعديل", description: `يتم الآن تعديل رحلة: ${tripToLoad.name}` });
            // Do not call loadActiveOrDefaultTripData here as edit load was successful
          } else {
            // tripIdToEdit was present, but tripToLoad was not found in allSavedTrips
            toast({ variant: "destructive", title: "خطأ", description: "لم يتم العثور على الرحلة المطلوبة للتعديل في السجل." });
            loadActiveOrDefaultTripData(); // Fallback to default/active
          }
        } else {
          // tripIdToEdit was present, but no ALL_SAVED_TRIPS_KEY found
          toast({ variant: "destructive", title: "خطأ", description: "لا يوجد سجل للرحلات المحفوظة." });
          loadActiveOrDefaultTripData(); // Fallback to default/active
        }
      } else {
        // No tripIdToEdit, so load active or default (this is the normal path for a new trip)
        loadActiveOrDefaultTripData();
      }

    } catch (error) {
      console.error("Failed to initialize trip data:", error);
      toast({ variant: "destructive", title: "خطأ في تهيئة بيانات الرحلة", description: String(error) });
      loadActiveOrDefaultTripData(); // Fallback to default/active on any error
      // Ensure key is removed if an error occurred during an edit load attempt
      if (attemptedEditLoad && localStorage.getItem(EDITING_TRIP_ID_KEY)) { 
        localStorage.removeItem(EDITING_TRIP_ID_KEY); // Should have been removed already, but as a safeguard
      }
    } finally {
        setIsLoading(false);
    }
  }, []); // Empty dependency array ensures this runs once on mount

  const loadActiveOrDefaultTripData = () => {
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
        console.error("Error parsing active trip details:", e);
        setCurrentTripDetails(null);
      }
    } else {
       setCurrentTripDetails(null); // Reset if no active details
    }
    
    const savedTransactionsJson = localStorage.getItem(ACTIVE_TRANSACTIONS_KEY); 
    if (savedTransactionsJson) {
      try {
        const parsedActiveTransactions = JSON.parse(savedTransactionsJson).map((t: any) => {
          let type = t.type;
          if (type === 'CUSTODY_HANDOVER') {
              console.warn(`Old transaction type "CUSTODY_HANDOVER" found for transaction ID "${t.id}" in active data. Correcting to CUSTODY_HANDOVER_OWNER.`);
              type = TransactionType.CUSTODY_HANDOVER_OWNER;
          }
          else if (!Object.values(TransactionType).includes(type as TransactionType)) {
              console.warn(`Invalid transaction type "${t.type}" found for transaction ID "${t.id}" in active data. Defaulting to EXPENSE.`);
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
        setTransactions(parsedActiveTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } catch (e) {
        console.error("Error parsing active transactions from localStorage:", e);
        setTransactions([]);
      }
    } else {
      setTransactions([]);
    }
    
    setExchangeRates(loadExchangeRates()); 
    setEditingTripId(null); 
  };


  React.useEffect(() => {
    // Persist active (non-editing) trip data to localStorage
    if (!isLoading && !editingTripId) { 
      localStorage.setItem(ACTIVE_TRANSACTIONS_KEY, JSON.stringify(transactions));
      // Exchange rates are saved globally by ExchangeRateManager or handleSaveFullTrip's reset
      // saveExchangeRates(exchangeRates); // This might be redundant if rates are global
    }
  }, [transactions, isLoading, editingTripId]); // Removed exchangeRates from deps, managed elsewhere

  React.useEffect(() => {
    // Persist active (non-editing) trip details
    if (!isLoading && !editingTripId && currentTripDetails) {
      localStorage.setItem(ACTIVE_TRIP_DETAILS_KEY, JSON.stringify(currentTripDetails));
    } else if (!isLoading && !editingTripId && !currentTripDetails) {
      // Clear active trip details if not editing and no details are present
      localStorage.removeItem(ACTIVE_TRIP_DETAILS_KEY);
    }
  }, [currentTripDetails, isLoading, editingTripId]);


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
      prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
    handleCloseEditModal();
  };

  const handlePrint = async () => {
    const element = document.querySelector(".print-only");
    if (element && typeof window !== 'undefined') {
      try {
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default;
        
        let detailsForPrint: TripDetailsFormData | null = currentTripDetails; // Start with current state
        if (tripDetailsFormRef.current) { // Prefer validated data from form if available
            const validatedData = await tripDetailsFormRef.current.validateAndGetData();
            if (validatedData) {
                detailsForPrint = validatedData;
            }
        }

        if (!detailsForPrint) {
            toast({ variant: "destructive", title: "بيانات الرحلة غير كاملة للطباعة" });
            return;
        }
        
        // Temporarily update currentTripDetails for PrintableReport if form data is fresher
        // This ensures the print sees the latest validated data
        const originalDetails = currentTripDetails;
        if (detailsForPrint !== currentTripDetails) {
            setCurrentTripDetails(detailsForPrint);
            // Give React a tick to re-render PrintableReport with new currentTripDetails
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        html2pdf()
          .set({ margin: 0.5, filename: "transactions-report.pdf", image: { type: "jpeg", quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, logging: false }, jsPDF: { unit: "in", format: "a4", orientation: "portrait" }})
          .from(element)
          .save()
          .then(() => {
             if (detailsForPrint !== originalDetails) { // Restore if changed
                setCurrentTripDetails(originalDetails);
            }
          }).catch((pdfError) => {
            console.error("Error during PDF generation process:", pdfError);
            if (detailsForPrint !== originalDetails) { // Restore if changed
                setCurrentTripDetails(originalDetails);
            }
          });
      } catch (error) {
        console.error("Error generating PDF:", error);
        toast({ variant: "destructive", title: "خطأ في إنشاء PDF" });
      }
    }
  };

  const handleRatesUpdate = (newRates: ExchangeRates) => {
    saveExchangeRates(newRates); // Saves globally
    setExchangeRates(newRates); // Updates local state for current trip context
    toast({ title: "تم تحديث أسعار الصرف" });
  };

  const handleSaveFullTrip = async () => {
    setIsSavingFullTrip(true);

    const validatedTripDetails = await tripDetailsFormRef.current?.validateAndGetData();

    if (!validatedTripDetails) {
      toast({
        variant: "destructive",
        title: "بيانات الرحلة غير مكتملة أو غير صالحة",
        description: "يرجى إكمال وتصحيح بيانات الرحلة في النموذج أعلاه.",
      });
      setIsSavingFullTrip(false);
      return;
    }
    
    if (transactions.length === 0 && !editingTripId) { 
        toast({
            variant: "destructive",
            title: "لا توجد معاملات",
            description: "يرجى إضافة معاملة واحدة على الأقل قبل حفظ رحلة جديدة.",
        });
        setIsSavingFullTrip(false);
        return;
    }

    const tripName = `${validatedTripDetails.driverName} - ${validatedTripDetails.cityName || validatedTripDetails.countryName} - ${format(new Date(validatedTripDetails.tripStartDate), 'dd/MM/yyyy')}`;
    
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
            } catch(e) { console.error("Error parsing saved trips for created date", e); }
        }
    }

    const tripDataToSave: SavedTrip = {
      id: editingTripId || crypto.randomUUID(), 
      name: tripName,
      details: validatedTripDetails, 
      transactions: transactions, // Current transactions state
      exchangeRates: exchangeRates, // Current exchange rates state
      createdAt: editingTripId ? originalCreatedAt : new Date().toISOString(),
      ...(editingTripId && { updatedAt: new Date().toISOString() }) 
    };


    try {
      const existingTripsJson = localStorage.getItem(ALL_SAVED_TRIPS_KEY);
      let existingTrips: SavedTrip[] = existingTripsJson ? JSON.parse(existingTripsJson) : [];

      if (editingTripId) {
        existingTrips = existingTrips.map(trip => trip.id === editingTripId ? tripDataToSave : trip);
        toast({
          title: "تم تحديث الرحلة بنجاح!",
          description: `تم تحديث رحلة "${tripName}".`,
        });
      } else {
        existingTrips.push(tripDataToSave);
        toast({
          title: "تم حفظ الرحلة بنجاح!",
          description: `تم حفظ رحلة "${tripName}".`,
        });
      }
      
      localStorage.setItem(ALL_SAVED_TRIPS_KEY, JSON.stringify(existingTrips));

      // Clear active session data
      localStorage.removeItem(ACTIVE_TRANSACTIONS_KEY);
      localStorage.removeItem(ACTIVE_TRIP_DETAILS_KEY);
      // Reset global exchange rates to default for a new trip form
      saveExchangeRates({...DEFAULT_EXCHANGE_RATES_TO_USD});


      // Reset component state for a new trip
      setTransactions([]);
      setCurrentTripDetails(null); 
      setExchangeRates(loadExchangeRates()); // This will load defaults now
      setEditingTripId(null); 
      
      router.push('/saved-trips');

    } catch (error) {
      console.error("Failed to save/update full trip:", error);
      toast({ variant: "destructive", title: "خطأ في حفظ/تحديث الرحلة", description: "لم يتم حفظ/تحديث الرحلة بالكامل." });
    } finally {
      setIsSavingFullTrip(false);
    }
  };


  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ms-3">جارٍ تحميل البيانات...</p></div>;
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
            tripDetails={currentTripDetails} // Pass currentTripDetails, which should be updated by validateAndGetData for print
        />
      </div>
    </div>
  );
}
