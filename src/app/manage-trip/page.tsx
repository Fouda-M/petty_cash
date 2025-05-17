
"use client";

import * as React from "react";
import { useRouter } from 'next/navigation'; 
import { format } from 'date-fns'; 
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import TransactionTable from "@/components/transactions/TransactionTable";
import BalanceSummary from "@/components/transactions/BalanceSummary";
import PrintableReport from "@/components/print/PrintableReport";
import TripDetailsForm from "@/components/trip/TripDetailsForm";
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
const EDITING_TRIP_ID_KEY = "editingTripId_v1"; // Key for trip ID being edited

export default function ManageTripPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [currentTripDetails, setCurrentTripDetails] = React.useState<TripDetailsFormData | null>(null);
  const [exchangeRates, setExchangeRates] = React.useState<ExchangeRates>(() => loadExchangeRates());
  const [editingTripId, setEditingTripId] = React.useState<string | null>(null); // To store ID of trip being edited
  
  const [isLoading, setIsLoading] = React.useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [transactionToEdit, setTransactionToEdit] = React.useState<Transaction | null>(null);
  const [isExchangeRateManagerOpen, setIsExchangeRateManagerOpen] = React.useState(false);
  const [isSavingFullTrip, setIsSavingFullTrip] = React.useState(false);


  React.useEffect(() => {
    setIsLoading(true);
    let tripSuccessfullyLoadedForEdit = false;
    try {
      const tripIdToEdit = localStorage.getItem(EDITING_TRIP_ID_KEY);

      if (tripIdToEdit) {
        const allSavedTripsJson = localStorage.getItem(ALL_SAVED_TRIPS_KEY);
        if (allSavedTripsJson) {
          const allSavedTrips = JSON.parse(allSavedTripsJson) as SavedTrip[];
          const tripToLoad = allSavedTrips.find(trip => trip.id === tripIdToEdit);
          if (tripToLoad) {
            setCurrentTripDetails({
              ...tripToLoad.details,
              tripStartDate: new Date(tripToLoad.details.tripStartDate),
              tripEndDate: new Date(tripToLoad.details.tripEndDate),
            });
            
            const parsedTransactions = (tripToLoad.transactions || []).map((t: any) => {
              let type = t.type;
              if (type === 'CUSTODY_HANDOVER') {
                console.warn(`Old transaction type "CUSTODY_HANDOVER" found for transaction ID "${t.id}" in saved trip. Correcting to CUSTODY_HANDOVER_OWNER.`);
                type = TransactionType.CUSTODY_HANDOVER_OWNER;
              } 
              else if (!Object.values(TransactionType).includes(type as TransactionType)) {
                console.warn(`Invalid transaction type "${t.type}" found for transaction ID "${t.id}" in saved trip. Defaulting to EXPENSE.`);
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
            
            setTransactions(parsedTransactions);
            setExchangeRates(tripToLoad.exchangeRates);
            setEditingTripId(tripIdToEdit); 
            toast({ title: "تم تحميل الرحلة للتعديل", description: `يتم الآن تعديل رحلة: ${tripToLoad.name}` });
            tripSuccessfullyLoadedForEdit = true;
          } else {
            toast({ variant: "destructive", title: "خطأ", description: "لم يتم العثور على الرحلة المطلوبة للتعديل." });
          }
        } else {
          toast({ variant: "destructive", title: "خطأ", description: "لا يوجد سجل للرحلات المحفوظة للعثور على الرحلة المطلوبة." });
        }
        localStorage.removeItem(EDITING_TRIP_ID_KEY); // Clear it after attempting to load or if not found
      }
      
      if (!tripSuccessfullyLoadedForEdit) {
        loadActiveOrDefaultTripData();
      }

    } catch (error) {
      console.error("Failed to initialize trip data:", error);
      toast({ variant: "destructive", title: "خطأ في تهيئة بيانات الرحلة" });
      loadActiveOrDefaultTripData(); 
      if (localStorage.getItem(EDITING_TRIP_ID_KEY)) { // Ensure it's cleared even on error
        localStorage.removeItem(EDITING_TRIP_ID_KEY);
      }
    }
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Changed dependency array to [] to run once on mount

  const loadActiveOrDefaultTripData = () => {
    const activeDetailsJson = localStorage.getItem(ACTIVE_TRIP_DETAILS_KEY);
    if (activeDetailsJson) {
      const parsedDetails = JSON.parse(activeDetailsJson);
      setCurrentTripDetails({
        ...parsedDetails,
        tripStartDate: parsedDetails.tripStartDate ? new Date(parsedDetails.tripStartDate) : new Date(),
        tripEndDate: parsedDetails.tripEndDate ? new Date(parsedDetails.tripEndDate) : new Date(),
      });
    } else {
       setCurrentTripDetails(null);
    }
    
    const savedTransactionsJson = localStorage.getItem("transactions"); // This is for active, unsaved trip
    if (savedTransactionsJson) {
      const parsedTransactions = JSON.parse(savedTransactionsJson, (key, value) => {
        if (key === 'date') return new Date(value);
        return value;
      }).map((t: any) => {
        let type = t.type;
        if (type === 'CUSTODY_HANDOVER') {
            console.warn(`Old transaction type "CUSTODY_HANDOVER" found for transaction ID "${t.id}" in active data. Correcting to CUSTODY_HANDOVER_OWNER.`);
            type = TransactionType.CUSTODY_HANDOVER_OWNER;
        }
        else if (!Object.values(TransactionType).includes(type as TransactionType)) {
            console.warn(`Invalid transaction type "${t.type}" found for transaction ID "${t.id}" in active data. Defaulting to EXPENSE.`);
            type = TransactionType.EXPENSE;
        }
        return { ...t, id: t.id || crypto.randomUUID(), date: new Date(t.date), type: type as TransactionType, amount: Number(t.amount) || 0 };
      });
      setTransactions(parsedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } else {
      setTransactions([]);
    }
    
    setExchangeRates(loadExchangeRates());
    setEditingTripId(null); 
  };


  React.useEffect(() => {
    if (!isLoading && !editingTripId) { 
      localStorage.setItem("transactions", JSON.stringify(transactions));
      saveExchangeRates(exchangeRates); 
    }
  }, [transactions, exchangeRates, isLoading, editingTripId]);

  React.useEffect(() => {
    if (!isLoading && !editingTripId && currentTripDetails) {
      localStorage.setItem(ACTIVE_TRIP_DETAILS_KEY, JSON.stringify(currentTripDetails));
    } else if (!isLoading && !editingTripId && !currentTripDetails) {
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
        html2pdf()
          .set({ margin: 0.5, filename: "transactions-report.pdf", image: { type: "jpeg", quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, logging: false }, jsPDF: { unit: "in", format: "a4", orientation: "portrait" }})
          .from(element)
          .save();
      } catch (error) {
        console.error("Error generating PDF:", error);
        toast({ variant: "destructive", title: "خطأ في إنشاء PDF" });
      }
    }
  };

  const handleRatesUpdate = (newRates: ExchangeRates) => {
    saveExchangeRates(newRates); 
    setExchangeRates(newRates);
    toast({ title: "تم تحديث أسعار الصرف" });
  };

  const handleSaveFullTrip = () => {
    setIsSavingFullTrip(true);
    if (!currentTripDetails) {
      toast({
        variant: "destructive",
        title: "بيانات الرحلة غير مكتملة",
        description: "يرجى إدخال وحفظ بيانات الرحلة أولاً باستخدام النموذج أعلاه.",
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

    const tripName = `${currentTripDetails.driverName} - ${currentTripDetails.cityName || currentTripDetails.countryName} - ${format(currentTripDetails.tripStartDate, 'dd/MM/yyyy')}`;
    
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
      details: currentTripDetails,
      transactions: transactions,
      exchangeRates: exchangeRates,
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

      localStorage.removeItem("transactions");
      localStorage.removeItem(ACTIVE_TRIP_DETAILS_KEY);
      saveExchangeRates({...DEFAULT_EXCHANGE_RATES_TO_USD});


      setTransactions([]);
      setCurrentTripDetails(null); 
      setExchangeRates(loadExchangeRates()); 
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
        <PrintableReport transactions={transactions} exchangeRates={exchangeRates} tripDetails={currentTripDetails} />
      </div>
    </div>
  );
}

    