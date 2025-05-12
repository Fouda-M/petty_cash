
"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Transaction } from "@/types";
import { TransactionType } from "@/types";
import { Currency, getCurrencyInfo, CURRENCIES_INFO, getTransactionTypeInfo } from "@/lib/constants";
import { format } from "date-fns";
import { arSA } from "date-fns/locale"; 
import { ArrowUpDown, ListFilter, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TransactionTableProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
}

type SortKey = keyof Transaction | 'none';
type SortDirection = 'asc' | 'desc';

export default function TransactionTable({ transactions, onDeleteTransaction }: TransactionTableProps) {
  const [sortKey, setSortKey] = React.useState<SortKey>('date');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');
  const [currencyFilter, setCurrencyFilter] = React.useState<Set<Currency>>(new Set(Object.values(Currency)));

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const toggleCurrencyFilter = (currency: Currency) => {
    setCurrencyFilter(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currency)) {
        newSet.delete(currency);
      } else {
        newSet.add(currency);
      }
      return newSet.size === 0 ? new Set(Object.values(Currency)) : newSet;
    });
  };
  
  const sortedTransactions = React.useMemo(() => {
    let filtered = [...transactions].filter(t => currencyFilter.size === Object.values(Currency).length || currencyFilter.has(t.currency));

    if (sortKey === 'none') return filtered;
    
    return filtered.sort((a, b) => {
      let valA = a[sortKey as keyof Transaction];
      let valB = b[sortKey as keyof Transaction];

      if (valA instanceof Date && valB instanceof Date) {
        valA = valA.getTime();
        valB = valB.getTime();
      }
      
      // For type, sort by the enum string value
      if (sortKey === 'type') {
         valA = a.type.toString();
         valB = b.type.toString();
      }


      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB, 'ar') : valB.localeCompare(valA, 'ar');
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [transactions, sortKey, sortDirection, currencyFilter]);

  const formatCurrency = (amount: number, currencyCode: Currency) => {
    const currencyInfo = getCurrencyInfo(currencyCode);
    return `${currencyInfo?.symbol || ''}${amount.toLocaleString('ar', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getTransactionTypeName = (type: TransactionType) => {
    return getTransactionTypeInfo(type)?.name || type;
  };

  if (transactions.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>المعاملات</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">لا توجد معاملات بعد. أضف واحدة للبدء!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>سجل المعاملات</CardTitle>
          <CardDescription>عرض وإدارة معاملاتك المسجلة.</CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <ListFilter className="ms-2 h-4 w-4" /> 
              تصفية حسب العملة
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" dir="rtl">
            <DropdownMenuLabel>تصفية حسب العملة</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {CURRENCIES_INFO.map(c => (
              <DropdownMenuCheckboxItem
                key={c.code}
                checked={currencyFilter.has(c.code)}
                onCheckedChange={() => toggleCurrencyFilter(c.code)}
              >
                {c.name} ({c.code})
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  onClick={() => handleSort('date')}
                  className="cursor-pointer hover:bg-accent text-start"
                >
                  التاريخ <ArrowUpDown className={`me-2 h-4 w-4 inline ${sortKey === 'date' ? 'opacity-100' : 'opacity-50'}`} /> 
                </TableHead>
                <TableHead
                  onClick={() => handleSort('type')}
                  className="cursor-pointer hover:bg-accent text-start"
                >
                  النوع <ArrowUpDown className={`me-2 h-4 w-4 inline ${sortKey === 'type' ? 'opacity-100' : 'opacity-50'}`} /> 
                </TableHead>
                <TableHead
                  onClick={() => handleSort('description')}
                  className="cursor-pointer hover:bg-accent text-start"
                >
                  الوصف <ArrowUpDown className={`me-2 h-4 w-4 inline ${sortKey === 'description' ? 'opacity-100' : 'opacity-50'}`} /> 
                </TableHead>
                <TableHead
                  onClick={() => handleSort('amount')}
                  className="text-end cursor-pointer hover:bg-accent"
                >
                  المبلغ <ArrowUpDown className={`me-2 h-4 w-4 inline ${sortKey === 'amount' ? 'opacity-100' : 'opacity-50'}`} /> 
                </TableHead>
                <TableHead
                  onClick={() => handleSort('currency')}
                  className="cursor-pointer hover:bg-accent text-start"
                >
                  العملة <ArrowUpDown className={`me-2 h-4 w-4 inline ${sortKey === 'currency' ? 'opacity-100' : 'opacity-50'}`} /> 
                </TableHead>
                <TableHead className="text-end">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="text-start">{format(new Date(transaction.date), "PP", { locale: arSA })}</TableCell>
                  <TableCell className="text-start">{getTransactionTypeName(transaction.type)}</TableCell>
                  <TableCell className="font-medium text-start">{transaction.description}</TableCell>
                  <TableCell className="text-end">{formatCurrency(transaction.amount, transaction.currency)}</TableCell>
                  <TableCell className="text-start">{transaction.currency}</TableCell>
                  <TableCell className="text-end">
                    <Button variant="ghost" size="icon" onClick={() => onDeleteTransaction(transaction.id)} aria-label="حذف المعاملة">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
