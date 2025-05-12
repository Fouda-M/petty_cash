
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Transaction } from "@/types";
import { Currency, CONVERSION_TARGET_CURRENCIES, getCurrencyInfo, CURRENCIES_INFO } from "@/lib/constants";
import { convertCurrency } from "@/lib/exchangeRates";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

interface BalanceSummaryProps {
  transactions: Transaction[];
}

interface CalculatedBalance {
  currency: Currency;
  total: number;
  convertedValues: { [targetCurrency in Currency]?: number };
}

export default function BalanceSummary({ transactions }: BalanceSummaryProps) {
  const balances = React.useMemo(() => {
    const accBalances: Record<Currency, number> = {} as Record<Currency, number>;
    for (const currency of Object.values(Currency)) {
        accBalances[currency] = 0;
    }

    transactions.forEach((t) => {
      accBalances[t.currency] = (accBalances[t.currency] || 0) + t.amount;
    });
    
    const relevantCurrencies = CURRENCIES_INFO.filter(c => accBalances[c.code] !== 0 || CONVERSION_TARGET_CURRENCIES.includes(c.code));

    return relevantCurrencies.map((currencyInfo) => {
      const total = accBalances[currencyInfo.code];
      const convertedValues: { [targetCurrency in Currency]?: number } = {};
      CONVERSION_TARGET_CURRENCIES.forEach((target) => {
        if (currencyInfo.code !== target) { 
          convertedValues[target] = convertCurrency(total, currencyInfo.code, target);
        }
      });
      return { currency: currencyInfo.code, total, convertedValues };
    }).sort((a,b) => {
      const aIsTarget = CONVERSION_TARGET_CURRENCIES.includes(a.currency) && a.total !== 0;
      const bIsTarget = CONVERSION_TARGET_CURRENCIES.includes(b.currency) && b.total !== 0;
      if (aIsTarget && !bIsTarget) return -1;
      if (!aIsTarget && bIsTarget) return 1;
      // Use localeCompare for currency codes if they are strings, or direct comparison if enums
      return a.currency.localeCompare(b.currency);

    });
  }, [transactions]);

  const formatCurrencyDisplay = (amount: number, currencyCode: Currency) => {
    const currencyInfo = getCurrencyInfo(currencyCode);
    const displayAmount = amount.toLocaleString('ar', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); // Use 'ar' locale for number formatting
    return (
      <span className={cn(amount > 0 ? "text-[hsl(var(--positive-balance-fg))]" : amount < 0 ? "text-[hsl(var(--negative-balance-fg))]" : "text-muted-foreground")}>
        {amount > 0 && <TrendingUp className="inline h-4 w-4 ml-1" />} {/* Changed mr-1 to ml-1 */}
        {amount < 0 && <TrendingDown className="inline h-4 w-4 ml-1" />} {/* Changed mr-1 to ml-1 */}
        {currencyInfo?.symbol || ''}{displayAmount}
      </span>
    );
  };

  if (transactions.length === 0 && balances.every(b => b.total === 0)) {
     return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wallet className="ml-2 h-6 w-6 text-primary" /> {/* Changed mr-2 to ml-2 */}
            ملخص الرصيد
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
          <Wallet className="ml-2 h-6 w-6 text-primary" /> {/* Changed mr-2 to ml-2 */}
          ملخص الرصيد
        </CardTitle>
        <CardDescription>نظرة عامة على أرصدتك بعملات مختلفة.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">العملة</TableHead>
                <TableHead className="text-end">إجمالي الرصيد</TableHead>
                {CONVERSION_TARGET_CURRENCIES.map((target) => (
                  <TableHead key={target} className="text-end hidden sm:table-cell">
                    بالـ {target}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances.map((balance) => (
                <TableRow key={balance.currency}>
                  <TableCell className="font-medium text-start">{getCurrencyInfo(balance.currency)?.name || balance.currency}</TableCell>
                  <TableCell className="text-end font-semibold">
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
      </CardContent>
    </Card>
  );
}
