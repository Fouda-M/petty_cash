import { useQuery } from "@tanstack/react-query";
import qs from "query-string";
import { Transaction } from "@/types";

export interface TransactionFilters {
  startDate?: string; // ISO
  endDate?: string;   // ISO
  type?: string;      // TransactionType value
  search?: string;    // free text
}

export function useTransactions(filters: TransactionFilters) {
  return useQuery<Transaction[]>({
    queryKey: ["transactions", filters],
    queryFn: async () => {
      const query = qs.stringify(filters);
      const res = await fetch(`/api/transactions?${query}`);
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}
