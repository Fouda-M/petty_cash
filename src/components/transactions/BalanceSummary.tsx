
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Transaction } from "@/types";
import { TransactionType } from "@/types";
import { Currency, CONVERSION_TARGET_CURRENCIES, getCurrencyInfo } from "@/lib/constants";
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
  type: TransactionType;
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
          type: t.type,
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
      };
    });
    return summary;
  }, [transactions]);


  const formatCurrencyDisplay = (
    amount: number,
    currencyCode: Currency,
    coloration: 'default' | 'positive' | 'negative' | 'neutral' = 'default'
  ) => {
    const currencyInfo = getCurrencyInfo(currencyCode);
    const displayAmount = amount.toLocaleString('ar', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let amountClass = "";
    switch (coloration) {
      case 'positive':
        amountClass = "text-[hsl(var(--positive-balance-fg))]";
        break;
      case 'negative':
        amountClass = "text-[hsl(var(--negative-balance-fg))]";
        break;
      case 'neutral':
        amountClass = "text-foreground";
        break;
      case 'default':
      default:
        amountClass = amount >= 0 ? "text-[hsl(var(--positive-balance-fg))]" : "text-[hsl(var(--negative-balance-fg))]";
        break;
    }

    return (
      <span className={cn(amountClass, "whitespace-nowrap font-semibold")}>
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
              <span className="whitespace-nowrap">{prefix} {getCurrencyInfo(detail.originalCurrency)?.name || detail.originalCurrency}: {formatCurrencyDisplay(detail.originalAmount, detail.originalCurrency, 'neutral')}</span>
              <span className="whitespace-nowrap text-end">(يعادل {formatCurrencyDisplay(detail.convertedAmount, targetCurrency, 'neutral')})</span>
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
              ↳ منها بالـ{getCurrencyInfo(originalCurrency)?.name || originalCurrency}: {formatCurrencyDisplay(totals.totalOriginal, originalCurrency, 'neutral')}
            </span>
            <span className="whitespace-nowrap text-end">
              (يعادل {formatCurrencyDisplay(totals.totalConverted, targetCurrency, 'neutral')})
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
          تحليل إجمالي الإيرادات (متضمنًا العهد من العملاء ومن المالك)، المصروفات، وأجرة السائق المحولة لعملات رئيسية لتحديد ربحية الرحلات.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div>
          <div className="space-y-4">
            {CONVERSION_TARGET_CURRENCIES.map(targetCurrency => {
              const details = tripProfitLossSummary[targetCurrency];
              if (!details) return null;
              const currencyName = getCurrencyInfo(targetCurrency)?.name || targetCurrency;

              const totalInitialIncomeAndCustody = details.revenueAndClientCustody + details.custodyOwner;
              const netProfitBeforeDriverFee = totalInitialIncomeAndCustody - details.expense;
              const profitBeforeOwnerCustodySettlement = netProfitBeforeDriverFee - details.driverFee;
              const finalNetProfitAfterOwnerCustodySettlement = profitBeforeOwnerCustodySettlement - details.custodyOwner;

              return (
                <div key={`profit-loss-${targetCurrency}`} className="p-4 bg-muted/30 rounded-lg shadow">
                  <h4 className="font-medium text-md mb-3 text-center border-b pb-2">
                    تفصيل العمليات بالـ{currencyName}
                  </h4>
                  <div className="space-y-2 text-sm">
                    {/* Step 1: ايراد الرحلات + العهدة المستلمة من العميل */}
                    <div className="flex justify-between items-center">
                      <span><Receipt className="inline h-4 w-4 me-1 text-primary" />إجمالي إيرادات الرحلات والعهد من العملاء:</span>
                      {formatCurrencyDisplay(details.revenueAndClientCustody, targetCurrency, 'positive')}
                    </div>
                    {renderItemizedTransactionDetailBreakdown(details.revenueAndClientCustodyDetails, targetCurrency)}

                    {/* Step 2: + العهدة المستلمة من صاحب السيارة */}
                    <div className="flex justify-between items-center mt-2">
                      <span><Landmark className="inline h-4 w-4 me-1 text-primary" />يُضاف: العهدة المستلمة من المالك:</span>
                      {formatCurrencyDisplay(details.custodyOwner, targetCurrency, 'positive')}
                    </div>
                    {renderItemizedTransactionDetailBreakdown(details.custodyOwnerDetails, targetCurrency)}

                    <Separator className="my-2.5" />
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">المجموع الفرعي (الإيرادات والعهد الإجمالية):</span>
                      {formatCurrencyDisplay(totalInitialIncomeAndCustody, targetCurrency, 'default')}
                    </div>
                    <Separator className="my-2.5" />

                    {/* Step 3: يطرح منها اجمالى المصروفات */}
                    <div className="flex justify-between items-center">
                      <span><ShoppingCart className="inline h-4 w-4 me-1 text-primary" />يُطرح: إجمالي المصروفات:</span>
                      {formatCurrencyDisplay(details.expense, targetCurrency, 'negative')}
                    </div>
                    {renderAggregatedTransactionDetailBreakdown(details.expenseDetails, targetCurrency)}

                    <Separator className="my-2.5" />

                    {/* Step 4: صافى الربح قبل اجرة السائق */}
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">صافي الربح قبل أجرة السائق:</span>
                      {formatCurrencyDisplay(netProfitBeforeDriverFee, targetCurrency, 'default')}
                    </div>

                    <Separator className="my-2.5" />

                    {/* Step 5: ثم تطرح اجرة السائق */}
                    <div className="flex justify-between items-center">
                      <span><HandCoins className="inline h-4 w-4 me-1 text-primary" />يُطرح: أجرة السائق:</span>
                      {formatCurrencyDisplay(details.driverFee, targetCurrency, 'negative')}
                    </div>
                    {renderAggregatedTransactionDetailBreakdown(details.driverFeeDetails, targetCurrency)}

                    <Separator className="my-3 border-primary/50" />

                    {/* Step 6: النتيجة صافى الرحلة قبل تسوية عهدة المالك */}
                    <div className="flex justify-between items-center text-md pt-1">
                      <span className="font-semibold">الربح/الخسارة التشغيلية (قبل تسوية عهدة المالك):</span>
                      {formatCurrencyDisplay(profitBeforeOwnerCustodySettlement, targetCurrency, 'default')}
                    </div>
                    
                    <Separator className="my-2.5" />

                    {/* New Step: Deduct Owner's Custody for final settlement */}
                    <div className="flex justify-between items-center">
                      <span><Landmark className="inline h-4 w-4 me-1 text-primary"/>يُخصم: عهدة المالك (لتسوية الربح):</span>
                      {formatCurrencyDisplay(details.custodyOwner, targetCurrency, 'negative')}
                    </div>
                    {/* Displaying details of owner's custody again for clarity on what's being deducted */}
                    {renderItemizedTransactionDetailBreakdown(details.custodyOwnerDetails, targetCurrency)}

                    <Separator className="my-3 border-accent" />
                                
                    {/* Final Net Profit After Owner Custody Deduction */}
                    <div className="flex justify-between items-center text-lg pt-1">
                      <span className="font-bold text-[hsl(var(--primary))]">صافي ربح/خسارة الرحلة النهائي (بعد تسوية عهدة المالك):</span>
                      {formatCurrencyDisplay(finalNetProfitAfterOwnerCustodySettlement, targetCurrency, 'default')}
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


    