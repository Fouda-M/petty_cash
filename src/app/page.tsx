
"use client";

import * as React from "react";
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import TransactionTable from "@/components/transactions/TransactionTable";
import BalanceSummary from "@/components/transactions/BalanceSummary";
import type { Transaction } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = React.useState(true); // To manage loading state and localStorage interaction

  const { toast } = useToast();

  // Load transactions from localStorage on component mount (client-side only)
  React.useEffect(() => {
    try {
      const savedTransactions = localStorage.getItem("transactions");
      if (savedTransactions) {
        const parsedTransactions = JSON.parse(savedTransactions, (key, value) => {
          // Ensure dates are properly revived
          if (key === 'date') return new Date(value);
          return value;
        });
        // Sort transactions after loading
        setTransactions(
          parsedTransactions.sort((a: Transaction, b: Transaction) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          )
        );
      } else {
        setTransactions([]); // Initialize with empty array if nothing is saved
      }
    } catch (error) {
      console.error("Failed to load transactions from localStorage:", error);
      setTransactions([]); // Fallback to empty array on error
      // Optionally, inform the user via a toast message about the failure
      // toast({ variant: "destructive", title: "Error", description: "Could not load saved transactions." });
    }
    setIsLoading(false); // Indicate that loading (or attempt) is complete
  }, []); // Empty dependency array ensures this runs once on mount on the client

  // Save transactions to localStorage whenever they change, but only after initial load is complete
  React.useEffect(() => {
    if (!isLoading) { // Ensures this doesn't run before initial data load attempt
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
      title: "Transaction Deleted",
      description: "The transaction has been removed.",
    });
  };

  // If still loading initial data, can optionally show a loading state.
  // However, for this setup, rendering with empty (or initially loaded) transactions is acceptable.
  // if (isLoading) {
  //   return <div className="container mx-auto p-4 md:p-8 text-center">Loading financial data...</div>;
  // }

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

