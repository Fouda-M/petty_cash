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
        if (currencyInfo.code !== target) { // Don't convert to itself if it's a target
          convertedValues[target] = convertCurrency(total, currencyInfo.code, target);
        }
      });
      return { currency: currencyInfo.code, total, convertedValues };
    }).sort((a,b) => {
      // Prioritize target currencies if their balance is non-zero
      const aIsTarget = CONVERSION_TARGET_CURRENCIES.includes(a.currency) && a.total !== 0;
      const bIsTarget = CONVERSION_TARGET_CURRENCIES.includes(b.currency) && b.total !== 0;
      if (aIsTarget && !bIsTarget) return -1;
      if (!aIsTarget && bIsTarget) return 1;
      return a.currency.localeCompare(b.currency);
    });
  }, [transactions]);

  const formatCurrencyDisplay = (amount: number, currencyCode: Currency) => {
    const currencyInfo = getCurrencyInfo(currencyCode);
    const displayAmount = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (
      <span className={cn(amount > 0 ? "text-[hsl(var(--positive-balance-fg))]" : amount < 0 ? "text-[hsl(var(--negative-balance-fg))]" : "text-muted-foreground")}>
        {amount > 0 && <TrendingUp className="inline h-4 w-4 mr-1" />}
        {amount < 0 && <TrendingDown className="inline h-4 w-4 mr-1" />}
        {currencyInfo?.symbol || ''}{displayAmount}
      </span>
    );
  };

  if (transactions.length === 0 && balances.every(b => b.total === 0)) {
     return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wallet className="mr-2 h-6 w-6 text-primary" />
            Balance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">No balances to display yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Wallet className="mr-2 h-6 w-6 text-primary" />
          Balance Summary
        </CardTitle>
        <CardDescription>Overview of your balances across different currencies.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Total Balance</TableHead>
                {CONVERSION_TARGET_CURRENCIES.map((target) => (
                  <TableHead key={target} className="text-right hidden sm:table-cell">
                    In {target}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances.map((balance) => (
                <TableRow key={balance.currency}>
                  <TableCell className="font-medium">{getCurrencyInfo(balance.currency)?.name || balance.currency}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrencyDisplay(balance.total, balance.currency)}
                  </TableCell>
                  {CONVERSION_TARGET_CURRENCIES.map((target) => (
                    <TableCell key={`${balance.currency}-${target}`} className="text-right hidden sm:table-cell">
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
