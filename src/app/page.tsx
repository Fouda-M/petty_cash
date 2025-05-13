
"use client";

import * as React from "react";
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import TransactionTable from "@/components/transactions/TransactionTable";
import BalanceSummary from "@/components/transactions/BalanceSummary";
import PrintableReport from "@/components/print/PrintableReport";
import TripDetailsForm from "@/components/trip/TripDetailsForm";
import type { Transaction, ExchangeRates } from "@/types";
import { TransactionType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Printer, Settings } from "lucide-react"; // Added Settings icon
import { loadExchangeRates, saveExchangeRates, DEFAULT_EXCHANGE_RATES_TO_USD } from "@/lib/exchangeRates";
import ExchangeRateManager from "@/components/settings/ExchangeRateManager"; // New component

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function HomePage() {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [transactionToEdit, setTransactionToEdit] = React.useState<Transaction | null>(null);
  const [exchangeRates, setExchangeRates] = React.useState<ExchangeRates>(DEFAULT_EXCHANGE_RATES_TO_USD);
  const [isExchangeRateManagerOpen, setIsExchangeRateManagerOpen] = React.useState(false);


  const { toast } = useToast();

  React.useEffect(() => {
    // Load exchange rates
    setExchangeRates(loadExchangeRates());

    // Load transactions
    try {
      const savedTransactions = localStorage.getItem("transactions");
      if (savedTransactions) {
        const parsedTransactions = JSON.parse(savedTransactions, (key, value) => {
          if (key === 'date') return new Date(value);
          return value;
        }).map((t: any) => {
          let type = t.type;
          if (type === 'CUSTODY_HANDOVER') {
            type = TransactionType.CUSTODY_HANDOVER_OWNER;
          } else if (!Object.values(TransactionType).includes(type as TransactionType)) {
            console.warn(`Invalid transaction type "${t.type}" found for transaction ID "${t.id}". Defaulting to EXPENSE.`);
            type = TransactionType.EXPENSE;
          }
          return {
            ...t,
            id: t.id || crypto.randomUUID(),
            date: new Date(t.date),
            type: type as TransactionType,
            amount: Number(t.amount) || 0,
          };
        });
        setTransactions(
          parsedTransactions.sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
          )
        );
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error("Failed to load transactions from localStorage:", error);
      toast({
        variant: "destructive",
        title: "خطأ في تحميل المعاملات",
        description: "لم يتم تحميل المعاملات المحفوظة. قد تكون البيانات تالفة.",
      });
      setTransactions([]);
    }
    setIsLoading(false);
  }, [toast]);

  React.useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("transactions", JSON.stringify(transactions));
    }
  }, [transactions, isLoading]);

  const handleAddTransaction = (newTransaction: Transaction) => {
    setTransactions((prevTransactions) =>
      [...prevTransactions, newTransaction].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    toast({
      title: "تم حذف المعاملة",
      description: "تمت إزالة المعاملة.",
    });
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
        const html2pdf = (await import('html2pdf.js')).default;
        html2pdf()
          .set({
            margin: 0.5,
            filename: "transactions-report.pdf",
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true }, // Added useCORS
            jsPDF: { unit: "in", format: "a4", orientation: "portrait" }
          })
          .from(element)
          .save();
      } catch (error) {
        console.error("Error generating PDF:", error);
        toast({
          variant: "destructive",
          title: "خطأ في إنشاء PDF",
          description: "حدث خطأ أثناء محاولة حفظ التقرير كملف PDF.",
        });
      }
    }
  };

  const handleRatesUpdate = (newRates: ExchangeRates) => {
    saveExchangeRates(newRates);
    setExchangeRates(newRates);
  };

  if (isLoading) {
    return (
        <div className="flex justify-center items-center min-h-screen">
            <p>جارٍ تحميل البيانات...</p> {}
        </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <TripDetailsForm />
      
      <div className="flex justify-end gap-2 mb-4 no-print">
        <Button onClick={() => setIsExchangeRateManagerOpen(true)} variant="outline">
          <Settings className="ms-2 h-4 w-4" />
          أسعار الصرف
        </Button>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="ms-2 h-4 w-4" />
          حفظ كـ PDF
        </Button>
      </div>

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

      {isEditModalOpen && transactionToEdit && (
        <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleCloseEditModal();
          } else {
            setIsEditModalOpen(true);
          }
        }}>
          <DialogContent className="sm:max-w-[425px] md:max-w-[600px] no-print">
            <DialogHeader>
              <DialogTitle>تعديل المعاملة</DialogTitle>
              <DialogDescription>
                قم بتحديث تفاصيل معاملتك هنا. انقر على حفظ عند الانتهاء.
              </DialogDescription>
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
        <PrintableReport transactions={transactions} exchangeRates={exchangeRates} />
      </div>
    </div>
  );
}
