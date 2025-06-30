"use client";

import * as React from "react";
import { useForm } from "react-hook-form"; // Import useForm
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
import { FixedSizeList, ListChildComponentProps } from "react-window";
import { TransactionType, Currency } from "@/types";
import { getCurrencyInfo, CURRENCIES_INFO, getTransactionTypeInfo, TRANSACTION_TYPES_INFO } from "@/lib/constants";
import { format, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";
import { ArrowUpDown, Trash2, Pencil, Filter as FilterIcon, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
// Import Form, FormField, FormItem, FormLabel
import { Form, FormField, FormItem, FormLabel } from "@/components/ui/form";

interface TransactionTableProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  onEditTransactionRequest: (transaction: Transaction) => void;
}

type SortKey = keyof Transaction | 'none';
type SortDirection = 'asc' | 'desc';

export default function TransactionTable({ transactions, onDeleteTransaction, onEditTransactionRequest }: TransactionTableProps) {
  const [sortKey, setSortKey] = React.useState<SortKey>('date');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');

  // Filter states
  const [isFilterDialogOpen, setIsFilterDialogOpen] = React.useState(false);
  const [dateFilterFrom, setDateFilterFrom] = React.useState<Date | undefined>(undefined);
  const [dateFilterTo, setDateFilterTo] = React.useState<Date | undefined>(undefined);
  const [typeFilter, setTypeFilter] = React.useState<Set<TransactionType>>(new Set());
  const [descriptionFilter, setDescriptionFilter] = React.useState<string>("");
  const [amountMinFilter, setAmountMinFilter] = React.useState<number | undefined>(undefined);
  const [amountMaxFilter, setAmountMaxFilter] = React.useState<number | undefined>(undefined);
  const [currencyFilter, setCurrencyFilter] = React.useState<Set<Currency>>(new Set());

  // Initialize a form for the filter dialog (primarily for context for FormLabel)
  const filterForm = useForm();

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const toggleCurrencyFilterItem = (currency: Currency) => {
    setCurrencyFilter(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currency)) {
        newSet.delete(currency);
      } else {
        newSet.add(currency);
      }
      return newSet;
    });
  };

  const toggleTypeFilterItem = (transactionType: TransactionType) => {
    setTypeFilter(prev => {
      const newSet = new Set(prev);
      if (newSet.has(transactionType)) {
        newSet.delete(transactionType);
      } else {
        newSet.add(transactionType);
      }
      return newSet;
    });
  };

  const handleClearFilters = () => {
    setDateFilterFrom(undefined);
    setDateFilterTo(undefined);
    setTypeFilter(new Set());
    setDescriptionFilter("");
    setAmountMinFilter(undefined);
    setAmountMaxFilter(undefined);
    setCurrencyFilter(new Set());
  };

  const filteredAndSortedTransactions = React.useMemo(() => {
    let filtered = [...transactions].map(t => ({
      ...t,
      date: typeof t.date === 'string' ? parseISO(t.date) : t.date
    }));

    if (dateFilterFrom) {
      const fromDate = new Date(dateFilterFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(t => t.date >= fromDate);
    }
    if (dateFilterTo) {
      const toDate = new Date(dateFilterTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => t.date <= toDate);
    }

    if (typeFilter.size > 0) {
      filtered = filtered.filter(t => typeFilter.has(t.type));
    }

    if (descriptionFilter.trim() !== "") {
      filtered = filtered.filter(t => t.description.toLowerCase().includes(descriptionFilter.toLowerCase()));
    }

    if (amountMinFilter !== undefined) {
      filtered = filtered.filter(t => t.amount >= amountMinFilter);
    }
    if (amountMaxFilter !== undefined) {
      filtered = filtered.filter(t => t.amount <= amountMaxFilter);
    }

    if (currencyFilter.size > 0) {
      filtered = filtered.filter(t => currencyFilter.has(t.currency));
    }

    if (sortKey === 'none') return filtered;

    return filtered.sort((a, b) => {
      let valA = a[sortKey as keyof Transaction];
      let valB = b[sortKey as keyof Transaction];

      if (valA instanceof Date && valB instanceof Date) {
        valA = valA.getTime();
        valB = valB.getTime();
      }

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
  }, [transactions, sortKey, sortDirection, dateFilterFrom, dateFilterTo, typeFilter, descriptionFilter, amountMinFilter, amountMaxFilter, currencyFilter]);

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
        <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <FilterIcon className="ms-2 h-4 w-4" />
              تصفية / فرز
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl">
            <DialogHeader>
              <DialogTitle>تصفية المعاملات</DialogTitle>
              <DialogDescription>
                قم بتطبيق الفلاتر لعرض معاملات محددة.
              </DialogDescription>
            </DialogHeader>
            <Form {...filterForm}>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-2">
                {/* Date Filter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={filterForm.control}
                    name="dateFilterFrom"
                    render={() => (
                      <FormItem>
                        <FormLabel>من تاريخ</FormLabel>
                        <DatePicker date={dateFilterFrom} setDate={setDateFilterFrom} />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={filterForm.control}
                    name="dateFilterTo"
                    render={() => (
                      <FormItem>
                        <FormLabel>إلى تاريخ</FormLabel>
                        <DatePicker date={dateFilterTo} setDate={setDateFilterTo} />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Type Filter */}
                <FormField
                  control={filterForm.control}
                  name="typeFilter"
                  render={() => (
                    <FormItem>
                      <FormLabel>نوع المعاملة</FormLabel>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full justify-between text-start">
                            <span>
                              {typeFilter.size === 0
                                ? "جميع الأنواع"
                                : `${typeFilter.size} أنواع مختارة`}
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-60 overflow-y-auto">
                          <DropdownMenuLabel>اختر الأنواع</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {TRANSACTION_TYPES_INFO.map(typeInfo => (
                            <DropdownMenuCheckboxItem
                              key={typeInfo.type}
                              checked={typeFilter.has(typeInfo.type)}
                              onCheckedChange={() => toggleTypeFilterItem(typeInfo.type)}
                            >
                              {typeInfo.name}
                            </DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </FormItem>
                  )}
                />

                {/* Description Filter */}
                <FormField
                  control={filterForm.control}
                  name="descriptionFilter"
                  render={() => (
                    <FormItem>
                      <FormLabel>الوصف</FormLabel>
                      <Input
                        placeholder="بحث بالوصف..."
                        value={descriptionFilter}
                        onChange={(e) => setDescriptionFilter(e.target.value)}
                      />
                    </FormItem>
                  )}
                />

                {/* Amount Filter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={filterForm.control}
                    name="amountMinFilter"
                    render={() => (
                      <FormItem>
                        <FormLabel>أقل مبلغ</FormLabel>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={amountMinFilter === undefined ? '' : String(amountMinFilter)}
                          onChange={(e) => setAmountMinFilter(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={filterForm.control}
                    name="amountMaxFilter"
                    render={() => (
                      <FormItem>
                        <FormLabel>أقصى مبلغ</FormLabel>
                        <Input
                          type="number"
                          placeholder="1000.00"
                          value={amountMaxFilter === undefined ? '' : String(amountMaxFilter)}
                          onChange={(e) => setAmountMaxFilter(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Currency Filter */}
                <FormField
                  control={filterForm.control}
                  name="currencyFilter"
                  render={() => (
                    <FormItem>
                      <FormLabel>العملة</FormLabel>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full justify-between text-start">
                            <span>
                              {currencyFilter.size === 0
                                ? "جميع العملات"
                                : `${currencyFilter.size} عملات مختارة`}
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-60 overflow-y-auto">
                          <DropdownMenuLabel>اختر العملات</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {CURRENCIES_INFO.map(currencyInfo => (
                            <DropdownMenuCheckboxItem
                              key={currencyInfo.code}
                              checked={currencyFilter.has(currencyInfo.code)}
                              onCheckedChange={() => toggleCurrencyFilterItem(currencyInfo.code)}
                            >
                              {currencyInfo.name} ({currencyInfo.symbol})
                            </DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </FormItem>
                  )}
                />
              </div>
            </Form>
            <DialogFooter>
              <Button variant="outline" onClick={handleClearFilters}>مسح الفلاتر</Button>
              <Button onClick={() => setIsFilterDialogOpen(false)}>تطبيق</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  onClick={() => handleSort('date')}
                  className="cursor-pointer hover:bg-accent text-start whitespace-nowrap"
                >
                  التاريخ <ArrowUpDown className={`me-2 h-4 w-4 inline ${sortKey === 'date' ? 'opacity-100' : 'opacity-50'}`} />
                </TableHead>
                <TableHead
                  onClick={() => handleSort('type')}
                  className="cursor-pointer hover:bg-accent text-start whitespace-nowrap"
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
                  className="text-end cursor-pointer hover:bg-accent whitespace-nowrap"
                >
                  المبلغ <ArrowUpDown className={`me-2 h-4 w-4 inline ${sortKey === 'amount' ? 'opacity-100' : 'opacity-50'}`} />
                </TableHead>
                <TableHead
                  onClick={() => handleSort('currency')}
                  className="cursor-pointer hover:bg-accent text-start whitespace-nowrap"
                >
                  العملة <ArrowUpDown className={`me-2 h-4 w-4 inline ${sortKey === 'currency' ? 'opacity-100' : 'opacity-50'}`} />
                </TableHead>
                <TableHead className="text-end whitespace-nowrap">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTransactions.length > 100 ? (
                <FixedSizeList
                  height={450}
                  itemCount={filteredAndSortedTransactions.length}
                  itemSize={48}
                  width="100%"
                  itemData={{
                    transactions: filteredAndSortedTransactions,
                    onEditTransactionRequest,
                    onDeleteTransaction,
                  }}
                >
                  {({ index, style, data }: ListChildComponentProps) => {
                    const transaction = data.transactions[index];
                    return (
                      <TableRow key={transaction.id} style={style}>
                        <TableCell className="text-start whitespace-nowrap">{format(new Date(transaction.date), "PP", { locale: arSA })}</TableCell>
                        <TableCell className="text-start whitespace-nowrap">{getTransactionTypeName(transaction.type)}</TableCell>
                        <TableCell className="font-medium text-start">{transaction.description}</TableCell>
                        <TableCell className="text-end whitespace-nowrap">{formatCurrency(transaction.amount, transaction.currency)}</TableCell>
                        <TableCell className="text-start whitespace-nowrap">{getCurrencyInfo(transaction.currency)?.name || transaction.currency}</TableCell>
                        <TableCell className="text-end space-x-1 whitespace-nowrap">
                          <Button variant="ghost" size="icon" onClick={() => data.onEditTransactionRequest(transaction)} aria-label="تعديل المعاملة">
                            <Pencil className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => data.onDeleteTransaction(transaction.id)} aria-label="حذف المعاملة">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  }}
                </FixedSizeList>
              ) : (
                <>
                  {filteredAndSortedTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-start whitespace-nowrap">{format(new Date(transaction.date), "PP", { locale: arSA })}</TableCell>
                      <TableCell className="text-start whitespace-nowrap">{getTransactionTypeName(transaction.type)}</TableCell>
                      <TableCell className="font-medium text-start">{transaction.description}</TableCell>
                      <TableCell className="text-end whitespace-nowrap">{formatCurrency(transaction.amount, transaction.currency)}</TableCell>
                      <TableCell className="text-start whitespace-nowrap">{getCurrencyInfo(transaction.currency)?.name || transaction.currency}</TableCell>
                      <TableCell className="text-end space-x-1 whitespace-nowrap">
                        <Button variant="ghost" size="icon" onClick={() => onEditTransactionRequest(transaction)} aria-label="تعديل المعاملة">
                          <Pencil className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDeleteTransaction(transaction.id)} aria-label="حذف المعاملة">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAndSortedTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        لا توجد معاملات تطابق معايير التصفية الحالية.
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
