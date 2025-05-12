
"use client";

import * as React from "react";
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import TransactionTable from "@/components/transactions/TransactionTable";
import BalanceSummary from "@/components/transactions/BalanceSummary";
import type { Transaction } from "@/types";
import { TransactionType } from "@/types"; 
import { useToast } from "@/hooks/use-toast";
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

  const { toast } = useToast();

  React.useEffect(() => {
    try {
      const savedTransactions = localStorage.getItem("transactions");
      if (savedTransactions) {
        const parsedTransactions = JSON.parse(savedTransactions, (key, value) => {
          if (key === 'date') return new Date(value);
          return value;
        }).map((t: any) => { // Use any for broader compatibility with old structure
          let type = t.type;
          // Migration for old CUSTODY_HANDOVER type
          if (type === 'CUSTODY_HANDOVER') { 
            // Default migration: assume old handovers were from owner
            type = TransactionType.CUSTODY_HANDOVER_OWNER; 
          } else if (!Object.values(TransactionType).includes(type as TransactionType)) {
            // If type is invalid or missing from current enum, default to EXPENSE
            type = TransactionType.EXPENSE;
          }
          return { 
            ...t,
            id: t.id || crypto.randomUUID(), // Ensure ID exists
            date: new Date(t.date), // Ensure date is a Date object
            type: type as TransactionType, // Cast to TransactionType
            amount: Number(t.amount) || 0, // Ensure amount is a number
          };
        });
        setTransactions(
          parsedTransactions.sort((a: Transaction, b: Transaction) => 
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
  }, [toast]); // Added toast to dependency array as it's used in catch

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


  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1 space-y-8">
          <AddTransactionForm onTransactionAdded={handleAddTransaction} />
          <BalanceSummary transactions={transactions} />
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
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[425px] md:max-w-[600px]">
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
              className="pt-4" // Add some padding to the form when inside dialog
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
