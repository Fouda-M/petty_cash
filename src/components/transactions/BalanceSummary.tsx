
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Transaction } from "@/types";
import { TransactionType } from "@/types";
import { Currency, CONVERSION_TARGET_CURRENCIES, getCurrencyInfo, CURRENCIES_INFO } from "@/lib/constants";
import { convertCurrency } from "@/lib/exchangeRates";
import { cn } from "@/lib/utils";
import { Wallet, Scale, HandCoins, Receipt, ShoppingCart, Landmark } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface BalanceSummaryProps {
  transactions: Transaction[];
}

interface TransactionDetail {
  originalCurrency: Currency;
  originalAmount: number;
  convertedAmount: number; // to the target currency of the summary section
  type: TransactionType; // Added to distinguish revenue from client custody in details
}

interface TripProfitLossDetails {
  revenueAndClientCustody: number; 
  revenueAndClientCustodyDetails: TransactionDetail[];
  expense: number;
  expenseDetails: TransactionDetail[];
  custodyOwner: number;
  custodyOwnerDetails: TransactionDetail[];
  driverFee: number;
  driverFeeDetails: TransactionDetail[]; 
  net: number;
}


export default function BalanceSummary({ transactions }: BalanceSummaryProps) {

  const tripProfitLossSummary = React.useMemo(() => {
    const summary: Record<Currency, TripProfitLossDetails> = {} as any;

    CONVERSION_TARGET_CURRENCIES.forEach(targetCurrency => {
      let totalConvertedRevenueAndClientCustody = 0;
      let totalConvertedExpenses = 0;
      let totalConvertedCustodyOwner = 0;
      let totalConvertedDriverFee = 0;
      
      const revenueAndClientCustodyDetailsForTarget: TransactionDetail[] = [];
      const expenseDetailsForTarget: TransactionDetail[] = [];
      const custodyOwnerDetailsForTarget: TransactionDetail[] = [];
      const driverFeeDetailsForTarget: TransactionDetail[] = [];


      transactions.forEach(t => {
        const type = t.type;
        const convertedAmount = convertCurrency(t.amount, t.currency, targetCurrency);
        const detail: TransactionDetail = {
            originalCurrency: t.currency,
            originalAmount: t.amount,
            convertedAmount: convertedAmount,
            type: t.type, // Store type for detail breakdown
        };

        if (type === TransactionType.REVENUE || type === TransactionType.CUSTODY_HANDOVER_CLIENT) {
            totalConvertedRevenueAndClientCustody += convertedAmount;
            revenueAndClientCustodyDetailsForTarget.push(detail);
        }
        else if (type === TransactionType.EXPENSE) {
            totalConvertedExpenses += convertedAmount;
            expenseDetailsForTarget.push(detail);
        }
        else if (type === TransactionType.CUSTODY_HANDOVER_OWNER) {
            totalConvertedCustodyOwner += convertedAmount;
            custodyOwnerDetailsForTarget.push(detail);
        }
        else if (type === TransactionType.DRIVER_FEE) {
            totalConvertedDriverFee += convertedAmount;
            driverFeeDetailsForTarget.push(detail);
        }
      });
      
      summary[targetCurrency] = {
        revenueAndClientCustody: totalConvertedRevenueAndClientCustody,
        revenueAndClientCustodyDetails: revenueAndClientCustodyDetailsForTarget,
        expense: totalConvertedExpenses,
        expenseDetails: expenseDetailsForTarget,
        custodyOwner: totalConvertedCustodyOwner,
        custodyOwnerDetails: custodyOwnerDetailsForTarget,
        driverFee: totalConvertedDriverFee,
        driverFeeDetails: driverFeeDetailsForTarget,
        net: totalConvertedRevenueAndClientCustody - totalConvertedExpenses - totalConvertedCustodyOwner - totalConvertedDriverFee
      };
    });
    return summary;
  }, [transactions]);


  const formatCurrencyDisplay = (amount: number, currencyCode: Currency, showTrendIcons = true, isNeutral = false) => {
    const currencyInfo = getCurrencyInfo(currencyCode);
    const displayAmount = amount.toLocaleString('ar', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const amountClass = isNeutral ? "text-foreground" : (amount >= 0 ? "text-[hsl(var(--positive-balance-fg))]" : "text-[hsl(var(--negative-balance-fg))]");
    return (
      <span className={cn(amountClass, "whitespace-nowrap font-semibold")}>
        {/* Trend icons removed as per previous requests, but kept param for consistency if needed later */}
        {/* {!isNeutral && showTrendIcons && amount > 0 && <TrendingUp className="inline h-4 w-4 ms-1" />} */}
        {/* {!isNeutral && showTrendIcons && amount < 0 && <TrendingDown className="inline h-4 w-4 ms-1" />} */}
        {currencyInfo?.symbol || ''}{displayAmount}
      </span>
    );
  };

  const renderItemizedTransactionDetailBreakdown = (details: TransactionDetail[], targetCurrency: Currency) => {
    if (details.length === 0) return null;
    return (
      <div className="ps-6 pe-2 mt-1 text-xs text-muted-foreground space-y-0.5 border-s border-dashed border-primary/50 ms-2">
          {details.map((detail, index) => {
            let prefix = "↳ من";
            if (detail.type === TransactionType.CUSTODY_HANDOVER_CLIENT) {
                prefix = "↳ عهدة عميل من";
            } else if (detail.type === TransactionType.REVENUE) {
                prefix = "↳ إيراد من";
            }
             else if (detail.type === TransactionType.CUSTODY_HANDOVER_OWNER) {
                prefix = "↳ عهدة مالك من";
            }
            return (
              <div key={index} className="flex justify-between items-center py-0.5">
                  <span className="whitespace-nowrap">{prefix} {getCurrencyInfo(detail.originalCurrency)?.name || detail.originalCurrency}: {formatCurrencyDisplay(detail.originalAmount, detail.originalCurrency, false, true)}</span>
                  <span className="whitespace-nowrap text-end">(يعادل {formatCurrencyDisplay(detail.convertedAmount, targetCurrency, false, true)})</span>
              </div>
            );
          })}
      </div>
    );
  };

  const renderAggregatedTransactionDetailBreakdown = (details: TransactionDetail[], targetCurrency: Currency) => {
    if (details.length === 0) return null;

    const aggregated: Map<Currency, { totalOriginal: number, totalConverted: number }> = new Map();

    details.forEach(detail => {
      const existing = aggregated.get(detail.originalCurrency);
      if (existing) {
        existing.totalOriginal += detail.originalAmount;
        existing.totalConverted += detail.convertedAmount;
      } else {
        aggregated.set(detail.originalCurrency, {
          totalOriginal: detail.originalAmount,
          totalConverted: detail.convertedAmount,
        });
      }
    });
  
    if (aggregated.size === 0) return null;
    
    return (
      <div className="ps-6 pe-2 mt-1 text-xs text-muted-foreground space-y-0.5 border-s border-dashed border-primary/50 ms-2">
        {Array.from(aggregated.entries()).map(([originalCurrency, totals], index) => (
          <div key={index} className="flex justify-between items-center py-0.5">
            <span className="whitespace-nowrap">
              ↳ منها بالـ{getCurrencyInfo(originalCurrency)?.name || originalCurrency}: {formatCurrencyDisplay(totals.totalOriginal, originalCurrency, false, true)}
            </span>
            <span className="whitespace-nowrap text-end">
              (يعادل {formatCurrencyDisplay(totals.totalConverted, targetCurrency, false, true)})
            </span>
          </div>
        ))}
      </div>
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
           <Scale className="ms-2 h-6 w-6 text-primary" />
           ملخص ربحية الرحلات
        </CardTitle>
        <CardDescription>
            تحليل إجمالي الإيرادات (متضمنًا العهد من العملاء)، المصروفات، العهد المسلمة من المالك، وأجرة السائق المحولة لعملات رئيسية لتحديد ربحية الرحلات.
        </CardDescription>
      </CardHeader>
      <CardContent> {/* Removed space-y-8 as only one section remains */}
        
        {/* Section: Net Trip Profit/Loss (Converted) */}
        <div>
            {/* Title and description for this specific section are now part of the CardHeader */}
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
                                    <span><Receipt className="inline h-4 w-4 me-1 text-primary"/>إجمالي الإيرادات (رحلات + عهدة عميل):</span>
                                    {formatCurrencyDisplay(details.revenueAndClientCustody, targetCurrency, false)}
                                </div>
                                {renderItemizedTransactionDetailBreakdown(details.revenueAndClientCustodyDetails, targetCurrency)}
                                
                                <div className="flex justify-between items-center">
                                    <span><ShoppingCart className="inline h-4 w-4 me-1 text-primary"/>إجمالي المصروفات (رحلات):</span>
                                    {formatCurrencyDisplay(details.expense, targetCurrency, false)}
                                </div>
                                {renderAggregatedTransactionDetailBreakdown(details.expenseDetails, targetCurrency)}

                                <div className="flex justify-between items-center">
                                    <span><Landmark className="inline h-4 w-4 me-1 text-primary"/>اجمالى العهد (مسلمة من المالك):</span>
                                    {formatCurrencyDisplay(details.custodyOwner, targetCurrency, false)}
                                </div>
                                {renderItemizedTransactionDetailBreakdown(details.custodyOwnerDetails, targetCurrency)}
                                
                                <div className="flex justify-between items-center">
                                    <span><HandCoins className="inline h-4 w-4 me-1 text-primary"/>اجرة السائق:</span>
                                    {formatCurrencyDisplay(details.driverFee, targetCurrency, false)}
                                </div>
                                {renderAggregatedTransactionDetailBreakdown(details.driverFeeDetails, targetCurrency)}

                                <Separator className="my-2" />
                                
                                <div className="space-y-2 pt-2">
                                    <h5 className="font-semibold text-md text-foreground border-b border-primary/30 pb-1 mb-2">
                                        تفصيل صافي ربح/خسارة الرحلة:
                                    </h5>

                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">إجمالي الإيرادات والمقبوضات (معادل):</span>
                                        {formatCurrencyDisplay(details.revenueAndClientCustody, targetCurrency, false, true)}
                                    </div>
                                    
                                    {(() => {
                                        const totalDeductions = details.expense + details.custodyOwner + details.driverFee;
                                        const allDeductionDetails = [...details.expenseDetails, ...details.custodyOwnerDetails, ...details.driverFeeDetails];
                                        
                                        if (totalDeductions > 0 || allDeductionDetails.length > 0) {
                                            return (
                                                <>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-muted-foreground">إجمالي التكاليف والخصومات (معادل):</span>
                                                        {formatCurrencyDisplay(totalDeductions, targetCurrency, false, true)}
                                                    </div>
                                                    {renderAggregatedTransactionDetailBreakdown(allDeductionDetails, targetCurrency)}
                                                </>
                                            );
                                        }
                                        return null;
                                    })()}
                                    
                                    <Separator className="my-2 border-dashed" />
                                    
                                    <div className="flex justify-between items-center text-base">
                                        <span className="font-bold">صافي ربح/خسارة الرحلة النهائي:</span>
                                        {formatCurrencyDisplay(details.net, targetCurrency, true)}
                                    </div>
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
