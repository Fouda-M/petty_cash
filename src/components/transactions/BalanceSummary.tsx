
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Transaction } from "@/types";
import { TransactionType } from "@/types";
import { Currency, CONVERSION_TARGET_CURRENCIES, getCurrencyInfo, CURRENCIES_INFO } from "@/lib/constants";
import { convertCurrency } from "@/lib/exchangeRates";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet, Scale } from "lucide-react"; // Added Scale
import { Separator } from "@/components/ui/separator";

interface BalanceSummaryProps {
  transactions: Transaction[];
}

interface TypedTotals {
  revenue: number;
  expense: number;
  custody: number;
}

interface NetBalanceForTable {
  currency: Currency;
  total: number; // Net total in original currency
  convertedValues: { [targetCurrency in Currency]?: number };
}

interface NetTripRevenueDetails {
  revenue: number;
  expense: number;
  custody: number;
  net: number;
}

export default function BalanceSummary({ transactions }: BalanceSummaryProps) {

  const totalsByOriginalCurrency = React.useMemo(() => {
    const result: Record<Currency, TypedTotals> = {} as any;
    CURRENCIES_INFO.forEach(c => {
      result[c.code] = { revenue: 0, expense: 0, custody: 0 };
    });

    transactions.forEach(t => {
      // Ensure type exists, default to EXPENSE for legacy data if necessary
      const type = t.type || TransactionType.EXPENSE; 
      if (!result[t.currency]) { // Should not happen if CURRENCIES_INFO is exhaustive
          result[t.currency] = { revenue: 0, expense: 0, custody: 0 };
      }
      if (type === TransactionType.REVENUE) result[t.currency].revenue += t.amount;
      else if (type === TransactionType.EXPENSE) result[t.currency].expense += t.amount;
      else if (type === TransactionType.CUSTODY_HANDOVER) result[t.currency].custody += t.amount;
    });
    return result;
  }, [transactions]);

  const netBalancesForTable = React.useMemo((): NetBalanceForTable[] => {
    return CURRENCIES_INFO.map(currencyInfo => {
      const originalTotals = totalsByOriginalCurrency[currencyInfo.code] || { revenue: 0, expense: 0, custody: 0 };
      const netInOriginal = originalTotals.revenue - originalTotals.expense - originalTotals.custody;
      
      const convertedValues: { [targetCurrency in Currency]?: number } = {};
      CONVERSION_TARGET_CURRENCIES.forEach(target => {
        if (currencyInfo.code !== target) {
          convertedValues[target] = convertCurrency(netInOriginal, currencyInfo.code, target);
        }
      });
      return { currency: currencyInfo.code, total: netInOriginal, convertedValues };
    })
    .filter(b => b.total !== 0 || CONVERSION_TARGET_CURRENCIES.includes(b.currency))
    .sort((a,b) => { // Basic sort: target currencies with balances first, then others
      const aIsTargetAndHasBalance = CONVERSION_TARGET_CURRENCIES.includes(a.currency) && a.total !== 0;
      const bIsTargetAndHasBalance = CONVERSION_TARGET_CURRENCIES.includes(b.currency) && b.total !== 0;
      if (aIsTargetAndHasBalance && !bIsTargetAndHasBalance) return -1;
      if (!aIsTargetAndHasBalance && bIsTargetAndHasBalance) return 1;
      return a.currency.localeCompare(b.currency);
    });
  }, [totalsByOriginalCurrency]);

  const netTripRevenueSummary = React.useMemo(() => {
    const summary: Record<Currency, NetTripRevenueDetails> = {} as any;

    CONVERSION_TARGET_CURRENCIES.forEach(targetCurrency => {
      let totalConvertedRevenue = 0;
      let totalConvertedExpenses = 0;
      let totalConvertedCustody = 0;

      transactions.forEach(t => {
        const type = t.type || TransactionType.EXPENSE;
        const convertedAmount = convertCurrency(t.amount, t.currency, targetCurrency);
        if (type === TransactionType.REVENUE) totalConvertedRevenue += convertedAmount;
        else if (type === TransactionType.EXPENSE) totalConvertedExpenses += convertedAmount;
        else if (type === TransactionType.CUSTODY_HANDOVER) totalConvertedCustody += convertedAmount;
      });
      
      summary[targetCurrency] = {
        revenue: totalConvertedRevenue,
        expense: totalConvertedExpenses,
        custody: totalConvertedCustody,
        net: totalConvertedRevenue - totalConvertedExpenses - totalConvertedCustody
      };
    });
    return summary;
  }, [transactions]);


  const formatCurrencyDisplay = (amount: number, currencyCode: Currency, showTrendIcons = true) => {
    const currencyInfo = getCurrencyInfo(currencyCode);
    const displayAmount = amount.toLocaleString('ar', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (
      <span className={cn(amount >= 0 ? "text-[hsl(var(--positive-balance-fg))]" : "text-[hsl(var(--negative-balance-fg))]", "whitespace-nowrap font-semibold")}>
        {showTrendIcons && amount > 0 && <TrendingUp className="inline h-4 w-4 ms-1" />}
        {showTrendIcons && amount < 0 && <TrendingDown className="inline h-4 w-4 ms-1" />}
        {currencyInfo?.symbol || ''}{displayAmount}
      </span>
    );
  };
  
  const hasData = transactions.length > 0 || netBalancesForTable.some(b => b.total !== 0);

  if (!hasData) {
     return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wallet className="ms-2 h-6 w-6 text-primary" />
            ملخص الأرصدة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">لا توجد أرصدة لعرضها بعد.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Wallet className="ms-2 h-6 w-6 text-primary" />
          صافي الأرصدة الحالية
        </CardTitle>
        <CardDescription>نظرة عامة على صافي أرصدتك (الإيرادات - المصروفات - العهد) بعملات مختلفة.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {netBalancesForTable.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">العملة</TableHead>
                  <TableHead className="text-end">صافي الرصيد</TableHead>
                  {CONVERSION_TARGET_CURRENCIES.map((target) => (
                    <TableHead key={target} className="text-end hidden sm:table-cell">
                      بالـ {getCurrencyInfo(target)?.name || target}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {netBalancesForTable.map((balance) => (
                  <TableRow key={balance.currency}>
                    <TableCell className="font-medium text-start">{getCurrencyInfo(balance.currency)?.name || balance.currency}</TableCell>
                    <TableCell className="text-end">
                      {formatCurrencyDisplay(balance.total, balance.currency)}
                    </TableCell>
                    {CONVERSION_TARGET_CURRENCIES.map((target) => (
                      <TableCell key={`${balance.currency}-${target}`} className="text-end hidden sm:table-cell">
                        {balance.currency === target 
                          ? <span className="text-muted-foreground">-</span> 
                          : formatCurrencyDisplay(balance.convertedValues[target] || 0, target)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">لا توجد أرصدة لعرضها حاليًا.</p>
        )}
        
        <Separator />

        <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Scale className="ms-2 h-5 w-5 text-primary" />
                صافي إيراد الرحلة (معادل)
            </h3>
            <div className="space-y-4">
                {CONVERSION_TARGET_CURRENCIES.map(targetCurrency => {
                    const details = netTripRevenueSummary[targetCurrency];
                    const currencyName = getCurrencyInfo(targetCurrency)?.name || targetCurrency;
                    return (
                        <div key={targetCurrency} className="p-4 bg-muted/30 rounded-lg shadow">
                            <h4 className="font-medium text-md mb-3 text-center border-b pb-2">
                                إجمالي بالـ{currencyName}
                            </h4>
                            <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between items-center">
                                    <span>إجمالي الإيرادات:</span>
                                    {formatCurrencyDisplay(details.revenue, targetCurrency, false)}
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>إجمالي المصروفات:</span>
                                     {/* Display expenses as positive for clarity, they are subtracted in 'net' */}
                                    {formatCurrencyDisplay(details.expense, targetCurrency, false)}
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>إجمالي العهد المسلمة:</span>
                                    {/* Display custody as positive for clarity, they are subtracted in 'net' */}
                                    {formatCurrencyDisplay(details.custody, targetCurrency, false)}
                                </div>
                                <Separator className="my-2" />
                                <div className="flex justify-between items-center text-base">
                                    <span className="font-bold">صافي الإيراد:</span>
                                    {formatCurrencyDisplay(details.net, targetCurrency, true)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
