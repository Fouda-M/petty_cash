"use client";

import * as React from "react";
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import TransactionTable from "@/components/transactions/TransactionTable";
import BalanceSummary from "@/components/transactions/BalanceSummary";
import type { Transaction } from "@/types";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const [transactions, setTransactions] = React.useState<Transaction[]>(() => {
    if (typeof window !== 'undefined') {
      const savedTransactions = localStorage.getItem("transactions");
      return savedTransactions ? JSON.parse(savedTransactions, (key, value) => {
        if (key === 'date') return new Date(value);
        return value;
      }) : [];
    }
    return [];
  });
  const { toast } = useToast();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("transactions", JSON.stringify(transactions));
    }
  }, [transactions]);

  const handleAddTransaction = (newTransaction: Transaction) => {
    setTransactions((prevTransactions) =>
      [...prevTransactions, newTransaction].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    toast({
      title: "Transaction Deleted",
      description: "The transaction has been removed.",
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
