
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Transaction } from "@/types";
import { TransactionType } from "@/types";
import { Currency, CONVERSION_TARGET_CURRENCIES, getCurrencyInfo, CURRENCIES_INFO } from "@/lib/constants";
import { convertCurrency } from "@/lib/exchangeRates";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet, Scale, UserCircle2, HandCoins, Receipt, ShoppingCart, ArchiveRestore, Briefcase, Coins, Landmark, Users } from "lucide-react"; // Added Landmark, Users
import { Separator } from "@/components/ui/separator";

interface BalanceSummaryProps {
  transactions: Transaction[];
}

interface TypedTotals {
  revenue: number;
  expense: number;
  custodyHandoverOwner: number;
  custodyHandoverClient: number;
  custodyReturn: number;
}

interface NetCompanyCashFlow {
  currency: Currency;
  total: number; // Net total in original currency
  convertedValues: { [targetCurrency in Currency]?: number };
}

interface TripProfitLossDetails {
  revenue: number;
  expense: number;
  net: number;
}

interface DriverOutstandingBalance {
  currency: Currency;
  totalCustodyHandoverOwner: number;
  totalCustodyHandoverClient: number;
  totalRevenue: number;
  totalExpense: number;
  totalReturn: number;
  netOutstanding: number;
}

interface DriverRetainedFromRevenue {
    currency: Currency;
    totalRevenueInCurrency: number;
    totalCustodyHandoverClientInCurrency: number; // Added this
    totalCustodyReturnInCurrency: number;
    netRetainedByDriver: number;
    convertedValues: { [targetCurrency in Currency]?: number };
}


export default function BalanceSummary({ transactions }: BalanceSummaryProps) {

  const totalsByOriginalCurrency = React.useMemo(() => {
    const result: Record<Currency, TypedTotals> = {} as any;
    CURRENCIES_INFO.forEach(c => {
      result[c.code] = { revenue: 0, expense: 0, custodyHandoverOwner: 0, custodyHandoverClient: 0, custodyReturn: 0 };
    });

    transactions.forEach(t => {
      const type = t.type;
      if (!result[t.currency]) {
          result[t.currency] = { revenue: 0, expense: 0, custodyHandoverOwner: 0, custodyHandoverClient: 0, custodyReturn: 0 };
      }
      if (type === TransactionType.REVENUE) result[t.currency].revenue += t.amount;
      else if (type === TransactionType.EXPENSE) result[t.currency].expense += t.amount;
      else if (type === TransactionType.CUSTODY_HANDOVER_OWNER) result[t.currency].custodyHandoverOwner += t.amount;
      else if (type === TransactionType.CUSTODY_HANDOVER_CLIENT) result[t.currency].custodyHandoverClient += t.amount;
      else if (type === TransactionType.CUSTODY_RETURN) result[t.currency].custodyReturn += t.amount;
    });
    return result;
  }, [transactions]);

  const driverOutstandingBalances = React.useMemo((): DriverOutstandingBalance[] => {
    return CURRENCIES_INFO.map(currencyInfo => {
      const totals = totalsByOriginalCurrency[currencyInfo.code] || { 
          revenue: 0, 
          expense: 0, 
          custodyHandoverOwner: 0, 
          custodyHandoverClient: 0, 
          custodyReturn: 0 
      };
      // What driver received and is accountable for: custody from owner + custody from client + revenue collected
      // What driver spent or returned: expenses + custody returned to company
      const netOutstanding = 
        (totals.custodyHandoverOwner + totals.custodyHandoverClient + totals.revenue) - 
        (totals.expense + totals.custodyReturn);
      
      return {
        currency: currencyInfo.code,
        totalCustodyHandoverOwner: totals.custodyHandoverOwner,
        totalCustodyHandoverClient: totals.custodyHandoverClient,
        totalRevenue: totals.revenue,
        totalExpense: totals.expense,
        totalReturn: totals.custodyReturn,
        netOutstanding: netOutstanding,
      };
    }).filter(b =>
      b.totalCustodyHandoverOwner !== 0 ||
      b.totalCustodyHandoverClient !== 0 ||
      b.totalRevenue !== 0 ||
      b.totalExpense !== 0 ||
      b.totalReturn !== 0 ||
      b.netOutstanding !== 0
    );
  }, [totalsByOriginalCurrency]);

  const netCompanyCashFlows = React.useMemo((): NetCompanyCashFlow[] => {
    return CURRENCIES_INFO.map(currencyInfo => {
      const originalTotals = totalsByOriginalCurrency[currencyInfo.code] || { 
          revenue: 0, 
          expense: 0, 
          custodyHandoverOwner: 0, 
          custodyHandoverClient: 0, // Not directly part of company cash flow at handover
          custodyReturn: 0 
      };
      // Company cash impact: Revenue + Custody Returned - Expenses - Custody Handed Out (Owner)
      const netInOriginal = originalTotals.revenue + originalTotals.custodyReturn - originalTotals.expense - originalTotals.custodyHandoverOwner;
      
      const convertedValues: { [targetCurrency in Currency]?: number } = {};
      CONVERSION_TARGET_CURRENCIES.forEach(target => {
        if (currencyInfo.code !== target) {
          convertedValues[target] = convertCurrency(netInOriginal, currencyInfo.code, target);
        }
      });
      return { currency: currencyInfo.code, total: netInOriginal, convertedValues };
    })
    .filter(b => b.total !== 0 || CONVERSION_TARGET_CURRENCIES.includes(b.currency))
    .sort((a,b) => { 
      const aIsTargetAndHasBalance = CONVERSION_TARGET_CURRENCIES.includes(a.currency) && a.total !== 0;
      const bIsTargetAndHasBalance = CONVERSION_TARGET_CURRENCIES.includes(b.currency) && b.total !== 0;
      if (aIsTargetAndHasBalance && !bIsTargetAndHasBalance) return -1;
      if (!aIsTargetAndHasBalance && bIsTargetAndHasBalance) return 1;
      return a.currency.localeCompare(b.currency);
    });
  }, [totalsByOriginalCurrency]);

  const tripProfitLossSummary = React.useMemo(() => {
    const summary: Record<Currency, TripProfitLossDetails> = {} as any;

    CONVERSION_TARGET_CURRENCIES.forEach(targetCurrency => {
      let totalConvertedRevenue = 0;
      let totalConvertedExpenses = 0;

      transactions.forEach(t => {
        const type = t.type;
        const convertedAmount = convertCurrency(t.amount, t.currency, targetCurrency);
        if (type === TransactionType.REVENUE) totalConvertedRevenue += convertedAmount;
        else if (type === TransactionType.EXPENSE) totalConvertedExpenses += convertedAmount;
        // CUSTODY_HANDOVER_CLIENT and CUSTODY_HANDOVER_OWNER are not direct revenue/expense for P&L
      });
      
      summary[targetCurrency] = {
        revenue: totalConvertedRevenue,
        expense: totalConvertedExpenses,
        net: totalConvertedRevenue - totalConvertedExpenses
      };
    });
    return summary;
  }, [transactions]);

  const driverRetainedFromRevenueSummary = React.useMemo((): DriverRetainedFromRevenue[] => {
    return CURRENCIES_INFO.map(currencyInfo => {
      const totals = totalsByOriginalCurrency[currencyInfo.code] || { 
          revenue: 0, 
          expense: 0, 
          custodyHandoverOwner: 0, 
          custodyHandoverClient: 0, 
          custodyReturn: 0 
      };
      // Net retained by driver from revenue collected and client advances, after returning some.
      const netRetained = (totals.revenue + totals.custodyHandoverClient) - totals.custodyReturn;

      const convertedValues: { [targetCurrency in Currency]?: number } = {};
      CONVERSION_TARGET_CURRENCIES.forEach(target => {
        if (currencyInfo.code !== target) {
          convertedValues[target] = convertCurrency(netRetained, currencyInfo.code, target);
        }
      });

      return {
        currency: currencyInfo.code,
        totalRevenueInCurrency: totals.revenue,
        totalCustodyHandoverClientInCurrency: totals.custodyHandoverClient,
        totalCustodyReturnInCurrency: totals.custodyReturn,
        netRetainedByDriver: netRetained,
        convertedValues,
      };
    }).filter(s => 
        s.totalRevenueInCurrency !== 0 || 
        s.totalCustodyHandoverClientInCurrency !== 0 || 
        s.totalCustodyReturnInCurrency !== 0 || 
        s.netRetainedByDriver !== 0
    );
  }, [totalsByOriginalCurrency]);


  const formatCurrencyDisplay = (amount: number, currencyCode: Currency, showTrendIcons = true, isNeutral = false) => {
    const currencyInfo = getCurrencyInfo(currencyCode);
    const displayAmount = amount.toLocaleString('ar', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const amountClass = isNeutral ? "text-foreground" : (amount >= 0 ? "text-[hsl(var(--positive-balance-fg))]" : "text-[hsl(var(--negative-balance-fg))]");
    return (
      <span className={cn(amountClass, "whitespace-nowrap font-semibold")}>
        {!isNeutral && showTrendIcons && amount > 0 && <TrendingUp className="inline h-4 w-4 ms-1" />}
        {!isNeutral && showTrendIcons && amount < 0 && <TrendingDown className="inline h-4 w-4 ms-1" />}
        {currencyInfo?.symbol || ''}{displayAmount}
      </span>
    );
  };
  
  const hasData = transactions.length > 0;

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
           <Briefcase className="ms-2 h-6 w-6 text-primary" />
          ملخص مالي شامل
        </CardTitle>
        <CardDescription>نظرة عامة على الأرصدة المستحقة، التأثير المالي، ربحية الرحلات، والمبالغ المحتجزة بواسطة السائق.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        
        {/* Section 1: Outstanding Balance with Driver */}
        <div>
            <h3 className="text-xl font-semibold mb-3 flex items-center">
                <UserCircle2 className="ms-2 h-6 w-6 text-primary" />
                الرصيد المستحق مع السائق
            </h3>
            <CardDescription className="mb-4">
              تفاصيل المبالغ المسلمة للسائق (من الشركة أو العميل)، الإيرادات المحققة، المصروفات، والمبالغ المرتجعة، وصافي المبلغ المستحق مع السائق حاليًا.
            </CardDescription>
            {driverOutstandingBalances.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start">العملة</TableHead>
                      <TableHead className="text-end">عهدة (مالك) <Landmark className="inline h-4 w-4"/></TableHead>
                      <TableHead className="text-end">عهدة (عميل) <Users className="inline h-4 w-4"/></TableHead>
                      <TableHead className="text-end">إجمالي إيراد <Receipt className="inline h-4 w-4"/></TableHead>
                      <TableHead className="text-end">إجمالي مصروف <ShoppingCart className="inline h-4 w-4"/></TableHead>
                      <TableHead className="text-end">إجمالي مرتجع <ArchiveRestore className="inline h-4 w-4"/></TableHead>
                      <TableHead className="text-end">صافي مستحق <Briefcase className="inline h-4 w-4"/></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {driverOutstandingBalances.map((balance) => (
                      <TableRow key={`outstanding-${balance.currency}`}>
                        <TableCell className="font-medium text-start">{getCurrencyInfo(balance.currency)?.name || balance.currency}</TableCell>
                        <TableCell className="text-end">{formatCurrencyDisplay(balance.totalCustodyHandoverOwner, balance.currency, false, true)}</TableCell>
                        <TableCell className="text-end">{formatCurrencyDisplay(balance.totalCustodyHandoverClient, balance.currency, false, true)}</TableCell>
                        <TableCell className="text-end">{formatCurrencyDisplay(balance.totalRevenue, balance.currency, false, true)}</TableCell>
                        <TableCell className="text-end">{formatCurrencyDisplay(balance.totalExpense, balance.currency, false, true)}</TableCell>
                        <TableCell className="text-end">{formatCurrencyDisplay(balance.totalReturn, balance.currency, false, true)}</TableCell>
                        <TableCell className="text-end">{formatCurrencyDisplay(balance.netOutstanding, balance.currency, true)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">لا توجد أرصدة سائق لعرضها.</p>
            )}
        </div>

        <Separator />

        {/* Section 2: Net Current Balances (Company Cash Impact) */}
        <div>
            <h3 className="text-xl font-semibold mb-3 flex items-center">
                <Wallet className="ms-2 h-6 w-6 text-primary" />
                صافي الأرصدة (التأثير على خزنة الشركة)
            </h3>
            <CardDescription className="mb-4">
              نظرة عامة على صافي التغير في أرصدة الشركة (إيرادات + عهد مرتجعة - مصروفات - عهد مسلمة من المالك) بعملات مختلفة. عهد العملاء لا تؤثر مباشرة هنا.
            </CardDescription>
            {netCompanyCashFlows.length > 0 ? (
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
                    {netCompanyCashFlows.map((balance) => (
                      <TableRow key={`company-cash-${balance.currency}`}>
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
              <p className="text-muted-foreground text-center py-4">لا توجد أرصدة شركة لعرضها حاليًا.</p>
            )}
        </div>
        
        <Separator />

        {/* Section 3: Net Trip Profit/Loss (Converted) */}
        <div>
            <h3 className="text-xl font-semibold mb-3 flex items-center">
                <Scale className="ms-2 h-6 w-6 text-primary" />
                ملخص ربحية الرحلات (معادل)
            </h3>
            <CardDescription className="mb-4">
                تحليل إجمالي الإيرادات والمصروفات المحولة لعملات رئيسية لتحديد ربحية الرحلات.
            </CardDescription>
            <div className="space-y-4">
                {CONVERSION_TARGET_CURRENCIES.map(targetCurrency => {
                    const details = tripProfitLossSummary[targetCurrency];
                    if (!details) return null; 
                    const currencyName = getCurrencyInfo(targetCurrency)?.name || targetCurrency;
                    return (
                        <div key={`profit-loss-${targetCurrency}`} className="p-4 bg-muted/30 rounded-lg shadow">
                            <h4 className="font-medium text-md mb-3 text-center border-b pb-2">
                                إجمالي بالـ{currencyName}
                            </h4>
                            <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between items-center">
                                    <span>إجمالي الإيرادات (رحلات):</span>
                                    {formatCurrencyDisplay(details.revenue, targetCurrency, false)}
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>إجمالي المصروفات (رحلات):</span>
                                    {formatCurrencyDisplay(details.expense, targetCurrency, false)}
                                </div>
                                <Separator className="my-2" />
                                <div className="flex justify-between items-center text-base">
                                    <span className="font-bold">صافي ربح/خسارة الرحلة:</span>
                                    {formatCurrencyDisplay(details.net, targetCurrency, true)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        <Separator />

        {/* Section 4: Driver's Retained Amounts from Revenue (Potential Personal Expenses) */}
        <div>
            <h3 className="text-xl font-semibold mb-3 flex items-center">
                <Coins className="ms-2 h-6 w-6 text-primary" />
                تحليل المبالغ المحتجزة بواسطة السائق
            </h3>
            <CardDescription className="mb-4">
                تفصيل الإيرادات وعهد العملاء التي جمعها السائق، المبالغ التي أعادها منها، والمبلغ الصافي الذي احتفظ به (والذي قد يشمل مصروفاته الشخصية غير المغطاة من الشركة).
            </CardDescription>
            {driverRetainedFromRevenueSummary.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start">العملة</TableHead>
                      <TableHead className="text-end">إجمالي إيرادات <TrendingUp className="inline h-4 w-4"/></TableHead>
                      <TableHead className="text-end">عهدة (عميل) <Users className="inline h-4 w-4"/></TableHead>
                      <TableHead className="text-end">المرتجع للشركة <ArchiveRestore className="inline h-4 w-4"/></TableHead>
                      <TableHead className="text-end">صافي محتجز للسائق <UserCircle2 className="inline h-4 w-4"/></TableHead>
                       {CONVERSION_TARGET_CURRENCIES.map((target) => (
                        <TableHead key={`retained-${target}`} className="text-end hidden sm:table-cell">
                          صافي السائق بالـ {getCurrencyInfo(target)?.name || target}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {driverRetainedFromRevenueSummary.map((summary) => (
                      <TableRow key={`retained-summary-${summary.currency}`}>
                        <TableCell className="font-medium text-start">{getCurrencyInfo(summary.currency)?.name || summary.currency}</TableCell>
                        <TableCell className="text-end">{formatCurrencyDisplay(summary.totalRevenueInCurrency, summary.currency, false, true)}</TableCell>
                        <TableCell className="text-end">{formatCurrencyDisplay(summary.totalCustodyHandoverClientInCurrency, summary.currency, false, true)}</TableCell>
                        <TableCell className="text-end">{formatCurrencyDisplay(summary.totalCustodyReturnInCurrency, summary.currency, false, true)}</TableCell>
                        <TableCell className="text-end">{formatCurrencyDisplay(summary.netRetainedByDriver, summary.currency, true)}</TableCell>
                        {CONVERSION_TARGET_CURRENCIES.map((target) => (
                          <TableCell key={`retained-${summary.currency}-${target}`} className="text-end hidden sm:table-cell">
                            {summary.currency === target 
                              ? <span className="text-muted-foreground">-</span> 
                              : formatCurrencyDisplay(summary.convertedValues[target] || 0, target, true)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">لا توجد بيانات لعرض تحليل إيرادات السائق حاليًا.</p>
            )}
        </div>


      </CardContent>
    </Card>
  );
}
