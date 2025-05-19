
"use client";

import *a_s React from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import TransactionTable from "@/components/transactions/TransactionTable";
import BalanceSummary from "@/components/transactions/BalanceSummary";
import PrintableReport from "@/components/print/PrintableReport";
import TripDetailsForm, { type TripDetailsFormRef } from "@/components/trip/TripDetailsForm";
import type { Transaction, ExchangeRates, SavedTrip } from "@/types";
import type { TripDetailsFormData } from "@/lib/schemas";
import { TransactionType, Currency } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Printer, Settings, ArrowRight, Save, ListChecks, Loader2, Edit } from "lucide-react";
import { loadExchangeRates, saveExchangeRates as saveExchangeRatesToLocalStorage, DEFAULT_EXCHANGE_RATES_TO_USD } from "@/lib/exchangeRates";
import ExchangeRateManager from "@/components/settings/ExchangeRateManager";
import Link from "next/link";
import { supabase } from '@/lib/supabase/client';
import type { User } from "@supabase/supabase-js";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function ManageTripPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const tripDetailsFormRef = React.useRef<TripDetailsFormRef>(null);

  const [user, setUser] = React.useState<User | null>(null);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [currentTripDetails, setCurrentTripDetails] = React.useState<TripDetailsFormData | null>(null);
  const [exchangeRates, setExchangeRates] = React.useState<ExchangeRates>(() => loadExchangeRates()); // Still load from localStorage initially for new trips
  const [editingTripId, setEditingTripId] = React.useState<string | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [transactionToEdit, setTransactionToEdit] = React.useState<Transaction | null>(null);
  const [isExchangeRateManagerOpen, setIsExchangeRateManagerOpen] = React.useState(false);
  const [isSavingFullTrip, setIsSavingFullTrip] = React.useState(false);

  React.useEffect(() => {
    const initializePage = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({ title: "غير مصرح به", description: "يرجى تسجيل الدخول للمتابعة.", variant: "destructive" });
        router.push('/');
        return;
      }
      setUser(session.user);

      const tripIdToEdit = searchParams.get('edit');
      setEditingTripId(tripIdToEdit);

      if (tripIdToEdit) {
        console.log(`[ManageTripPage Debug] Attempting to load trip for edit from DB. ID: ${tripIdToEdit}`);
        const { data: tripToLoad, error } = await supabase
          .from('trips')
          .select('*')
          .eq('id', tripIdToEdit)
          .eq('user_id', session.user.id)
          .single();

        if (error) {
          console.error("[ManageTripPage Debug] Error fetching trip for edit:", error);
          toast({ variant: "destructive", title: "خطأ في تحميل الرحلة", description: error.message });
          // Proceed as a new trip if loading fails
          setCurrentTripDetails(null);
          setTransactions([]);
          setExchangeRates(loadExchangeRates()); // Load defaults for new trip
        } else if (tripToLoad) {
          console.log('[ManageTripPage Debug] Trip found in DB for edit:', tripToLoad);
          const tripData = tripToLoad as any; // Cast to any to access dynamic keys, or define a proper type
          
          setCurrentTripDetails({
            ...tripData.details,
            tripStartDate: new Date(tripData.details.tripStartDate),
            tripEndDate: new Date(tripData.details.tripEndDate),
          });

          const parsedTransactions = (Array.isArray(tripData.transactions) ? tripData.transactions : []).map((t: any) => {
            let type = t.type;
            if (type === 'CUSTODY_HANDOVER') {
              type = TransactionType.CUSTODY_HANDOVER_OWNER;
            } else if (!Object.values(TransactionType).includes(type as TransactionType)) {
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
          
          console.log('[ManageTripPage Debug] Parsed transactions for edit (count):', parsedTransactions.length);
          setTransactions(parsedTransactions);
          setExchangeRates(tripData.exchange_rates || loadExchangeRates()); // Load trip-specific rates or default
          toast({ title: "تم تحميل الرحلة للتعديل", description: `يتم الآن تعديل رحلة: ${tripData.name}` });
        } else {
           toast({ variant: "destructive", title: "خطأ", description: "لم يتم العثور على الرحلة المطلوبة للتعديل." });
           setCurrentTripDetails(null);
           setTransactions([]);
           setExchangeRates(loadExchangeRates());
        }
      } else {
        // No trip ID for editing, start fresh or load from localStorage if we reinstate that for drafts
        console.log('[ManageTripPage Debug] No trip ID for edit, starting fresh.');
        setCurrentTripDetails(null);
        setTransactions([]);
        setExchangeRates(loadExchangeRates()); // Load default/localStorage rates for a new trip
      }
      setIsLoading(false);
    };

    initializePage();
  }, [searchParams, router, toast]);


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
    toast({ title: "تم حذف المعاملة محليًا" });
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
        
        let detailsForPrint: TripDetailsFormData | null = null;
        if (tripDetailsFormRef.current) {
            detailsForPrint = await tripDetailsFormRef.current.validateAndGetData();
        }
        if (!detailsForPrint) {
            detailsForPrint = currentTripDetails;
        }

        if (!detailsForPrint) {
            toast({ variant: "destructive", title: "بيانات الرحلة غير كاملة للطباعة" });
            return;
        }

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
    saveExchangeRatesToLocalStorage(newRates); // Save to localStorage for new trips, or until explicitly saved with trip
    setExchangeRates(newRates);
    toast({ title: "تم تحديث أسعار الصرف محليًا" });
  };

  const handleSaveFullTrip = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "خطأ", description: "المستخدم غير مسجل. يرجى تسجيل الدخول أولاً." });
      return;
    }
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

    const tripName = `${validatedTripDetails.driverName} - ${validatedTripDetails.cityName || validatedTripDetails.countryName} - ${format(validatedTripDetails.tripStartDate, 'dd/MM/yyyy')}`;
    
    const tripDataPayload = {
      user_id: user.id,
      name: tripName,
      details: validatedTripDetails,
      transactions: transactions,
      exchange_rates: exchangeRates,
      updated_at: new Date().toISOString(), // Supabase will handle created_at for new, and trigger for updated_at if setup
    };

    try {
      let error;
      let successMessageTitle = "";
      let successMessageDescription = "";

      if (editingTripId) {
        const { error: updateError } = await supabase
          .from('trips')
          .update(tripDataPayload)
          .eq('id', editingTripId)
          .eq('user_id', user.id);
        error = updateError;
        successMessageTitle = "تم تحديث الرحلة بنجاح!";
        successMessageDescription = `تم تحديث رحلة "${tripName}".`;
      } else {
         // For new trips, we might want to include created_at explicitly if not handled by DB default effectively
        const { data: newTrip, error: insertError } = await supabase
          .from('trips')
          .insert({ ...tripDataPayload, created_at: new Date().toISOString() }) // id will be auto-generated by DB
          .select()
          .single();
        error = insertError;
        successMessageTitle = "تم حفظ الرحلة بنجاح!";
        successMessageDescription = `تم حفظ رحلة "${tripName}".`;
      }

      if (error) {
        console.error("Failed to save/update full trip to DB:", error);
        toast({ variant: "destructive", title: "خطأ في حفظ/تحديث الرحلة", description: error.message });
      } else {
        toast({
          title: successMessageTitle,
          description: successMessageDescription,
        });
        
        // Reset component state for a new trip
        setTransactions([]);
        setCurrentTripDetails(null);
        setExchangeRates(loadExchangeRates()); // Load defaults/localStorage for next new trip
        setEditingTripId(null); 
        
        if (tripDetailsFormRef.current) {
          // Reset form by passing null, TripDetailsForm useEffect will handle it
        }
        router.push('/saved-trips');
      }
    } catch (generalError: any) {
      console.error("General error during save/update full trip:", generalError);
      toast({ variant: "destructive", title: "خطأ عام في حفظ/تحديث الرحلة", description: generalError.message || "حدث خطأ غير متوقع." });
    } finally {
      setIsSavingFullTrip(false);
    }
  };


  if (isLoading) {
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
            tripDetails={
                (tripDetailsFormRef.current && tripDetailsFormRef.current.validateAndGetData()
                    ? (tripDetailsFormRef.current.validateAndGetData() as unknown as TripDetailsFormData)
                    : currentTripDetails) || null
            }
        />
      </div>
    </div>
  );
}
