
"use client";

import * as React from "react";
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import TransactionTable from "@/components/transactions/TransactionTable";
import BalanceSummary from "@/components/transactions/BalanceSummary";
import type { Transaction } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = React.useState(true); 

  const { toast } = useToast();

  React.useEffect(() => {
    try {
      const savedTransactions = localStorage.getItem("transactions");
      if (savedTransactions) {
        const parsedTransactions = JSON.parse(savedTransactions, (key, value) => {
          if (key === 'date') return new Date(value);
          return value;
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
      setTransactions([]); 
    }
    setIsLoading(false); 
  }, []); 

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

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1 space-y-8">
          <AddTransactionForm onTransactionAdded={handleAddTransaction} />
          <BalanceSummary transactions={transactions} />
        </div>
        <div className="lg:col-span-2">
          <TransactionTable transactions={transactions} onDeleteTransaction={handleDeleteTransaction} />
        </div>
      </div>
    </div>
  );
}
