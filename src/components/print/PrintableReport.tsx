
"use client";

import * as React from "react";
import type { Transaction } from "@/types";
import { TransactionType } from "@/types";
import { Currency, CONVERSION_TARGET_CURRENCIES, CURRENCIES_INFO, getCurrencyInfo } from "@/lib/constants";
import { convertCurrency } from "@/lib/exchangeRates";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { Receipt, ShoppingCart, Landmark, HandCoins, Scale } from "lucide-react";


interface PrintableReportProps {
  transactions: Transaction[];
}

interface TransactionDetailPrint {
  originalCurrency: Currency;
  originalAmount: number;
  convertedAmount: number;
  type: TransactionType;
}

interface TripProfitLossDetailsPrint {
  revenueAndClientCustody: number;
  revenueAndClientCustodyDetails: TransactionDetailPrint[];
  expense: number;
  expenseDetails: TransactionDetailPrint[];
  custodyOwner: number;
  custodyOwnerDetails: TransactionDetailPrint[];
  driverFee: number;
  driverFeeDetails: TransactionDetailPrint[];
}

interface AggregatedExpense {
    total: number;
    details: Transaction[];
}

const formatCurrencyDisplayPrint = (
  amount: number,
  currencyCode: Currency,
  coloration: 'default' | 'positive' | 'negative' | 'neutral' = 'default'
) => {
  const currencyInfo = getCurrencyInfo(currencyCode);
  const displayAmount = amount.toLocaleString('ar', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let amountClass = "";
  switch (coloration) {
    case 'positive': amountClass = "print-text-positive"; break;
    case 'negative': amountClass = "print-text-negative"; break;
    case 'neutral': amountClass = "print-text-neutral"; break;
    case 'default':
    default:
      amountClass = amount >= 0 ? "print-text-positive" : "print-text-negative";
      break;
  }

  return (
    <span className={cn(amountClass, "font-semibold whitespace-nowrap")}>
      {(currencyInfo?.symbol || currencyCode)}{displayAmount}
    </span>
  );
};

const renderItemizedTransactionDetailBreakdownPrint = (details: TransactionDetailPrint[], targetCurrency: Currency) => {
  if (details.length === 0) return null;
  return (
    <div className="ps-6 pe-2 mt-1 text-xs space-y-0.5 border-s border-dashed border-gray-400 ms-2">
      {details.map((detail, index) => {
        let prefix = "↳ من";
        if (detail.type === TransactionType.CUSTODY_HANDOVER_CLIENT) prefix = "↳ عهدة عميل من";
        else if (detail.type === TransactionType.REVENUE) prefix = "↳ إيراد من";
        else if (detail.type === TransactionType.CUSTODY_HANDOVER_OWNER) prefix = "↳ عهدة مالك من";
        return (
          <div key={index} className="flex justify-between items-center py-0.5">
            <span className="whitespace-nowrap">{prefix} {getCurrencyInfo(detail.originalCurrency)?.name || detail.originalCurrency}: {formatCurrencyDisplayPrint(detail.originalAmount, detail.originalCurrency, 'neutral')}</span>
            <span className="whitespace-nowrap text-end">(يعادل {formatCurrencyDisplayPrint(detail.convertedAmount, targetCurrency, 'neutral')})</span>
          </div>
        );
      })}
    </div>
  );
};

const renderAggregatedTransactionDetailBreakdownPrint = (details: TransactionDetailPrint[], targetCurrency: Currency) => {
  if (details.length === 0) return null;
  const aggregated: Map<Currency, { totalOriginal: number, totalConverted: number }> = new Map();
  details.forEach(detail => {
    const existing = aggregated.get(detail.originalCurrency);
    if (existing) {
      existing.totalOriginal += detail.originalAmount;
      existing.totalConverted += detail.convertedAmount;
    } else {
      aggregated.set(detail.originalCurrency, { totalOriginal: detail.originalAmount, totalConverted: detail.convertedAmount });
    }
  });
  if (aggregated.size === 0) return null;
  return (
    <div className="ps-6 pe-2 mt-1 text-xs space-y-0.5 border-s border-dashed border-gray-400 ms-2">
      {Array.from(aggregated.entries()).map(([originalCurrency, totals], index) => (
        <div key={index} className="flex justify-between items-center py-0.5">
          <span className="whitespace-nowrap">↳ منها بالـ{getCurrencyInfo(originalCurrency)?.name || originalCurrency}: {formatCurrencyDisplayPrint(totals.totalOriginal, originalCurrency, 'neutral')}</span>
          <span className="whitespace-nowrap text-end">(يعادل {formatCurrencyDisplayPrint(totals.totalConverted, targetCurrency, 'neutral')})</span>
        </div>
      ))}
    </div>
  );
};


export default function PrintableReport({ transactions }: PrintableReportProps) {
  const [clientRender, setClientRender] = React.useState(false);
  React.useEffect(() => {
    setClientRender(true);
  }, []);


  const aggregatedExpensesByCurrency = React.useMemo(() => {
    const result: Record<Currency, AggregatedExpense> = {} as any;
    CURRENCIES_INFO.forEach(currencyInfo => {
      result[currencyInfo.code] = { total: 0, details: [] };
    });

    transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .forEach(t => {
        if (result[t.currency]) {
          result[t.currency].total += t.amount;
          result[t.currency].details.push(t);
        }
      });
    return result;
  }, [transactions]);

  const tripProfitLossSummaryPrint = React.useMemo(() => {
    const summary: Record<Currency, TripProfitLossDetailsPrint> = {} as any;
    CONVERSION_TARGET_CURRENCIES.forEach(targetCurrency => {
      let totalConvertedRevenueAndClientCustody = 0;
      let totalConvertedExpenses = 0;
      let totalConvertedCustodyOwner = 0;
      let totalConvertedDriverFee = 0;
      const revenueAndClientCustodyDetailsForTarget: TransactionDetailPrint[] = [];
      const expenseDetailsForTarget: TransactionDetailPrint[] = [];
      const custodyOwnerDetailsForTarget: TransactionDetailPrint[] = [];
      const driverFeeDetailsForTarget: TransactionDetailPrint[] = [];

      transactions.forEach(t => {
        const convertedAmount = convertCurrency(t.amount, t.currency, targetCurrency);
        const detail: TransactionDetailPrint = {
          originalCurrency: t.currency,
          originalAmount: t.amount,
          convertedAmount: convertedAmount,
          type: t.type,
        };
        if (t.type === TransactionType.REVENUE || t.type === TransactionType.CUSTODY_HANDOVER_CLIENT) {
          totalConvertedRevenueAndClientCustody += convertedAmount;
          revenueAndClientCustodyDetailsForTarget.push(detail);
        } else if (t.type === TransactionType.EXPENSE) {
          totalConvertedExpenses += convertedAmount;
          expenseDetailsForTarget.push(detail);
        } else if (t.type === TransactionType.CUSTODY_HANDOVER_OWNER) {
          totalConvertedCustodyOwner += convertedAmount;
          custodyOwnerDetailsForTarget.push(detail);
        } else if (t.type === TransactionType.DRIVER_FEE) {
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

  if (!clientRender) {
    return null; // Or a loading indicator
  }

  return (
    <div id="printable-content" className="p-4 bg-white text-black" dir="rtl">
      <h1 className="text-2xl font-bold mb-8 text-center">تقرير المعاملات والربحية</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">ملخص المصروفات المفصل حسب العملة</h2>
        {CURRENCIES_INFO.map(currencyInfo => {
          const expensesData = aggregatedExpensesByCurrency[currencyInfo.code];
          if (!expensesData || expensesData.total === 0) return null;

          return (
            <div key={currencyInfo.code} className="mb-6 p-4 border rounded-lg bg-muted/30">
              <h3 className="text-lg font-medium mb-3">
                إجمالي المصروفات بعملة {currencyInfo.name} ({currencyInfo.symbol}): {formatCurrencyDisplayPrint(expensesData.total, currencyInfo.code, 'negative')}
              </h3>
              {expensesData.details.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-start p-2">التاريخ</th>
                      <th className="text-start p-2">الوصف</th>
                      <th className="text-end p-2">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expensesData.details.map(exp => (
                      <tr key={exp.id} className="border-b last:border-b-0">
                        <td className="p-2">{format(new Date(exp.date), "yyyy/MM/dd", { locale: arSA })}</td>
                        <td className="p-2">{exp.description}</td>
                        <td className="text-end p-2">{formatCurrencyDisplayPrint(exp.amount, exp.currency, 'negative')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4 border-b pb-2 flex items-center">
          <Scale className="ms-2 h-5 w-5 text-primary" />
          ملخص ربحية الرحلات (معادل)
        </h2>
        <div className="space-y-6">
          {CONVERSION_TARGET_CURRENCIES.map(targetCurrency => {
            const details = tripProfitLossSummaryPrint[targetCurrency];
            if (!details) return null;
            const currencyName = getCurrencyInfo(targetCurrency)?.name || targetCurrency;
            const totalInitialIncomeAndCustody = details.revenueAndClientCustody + details.custodyOwner;
            const netProfitBeforeDriverFee = totalInitialIncomeAndCustody - details.expense;
            const profitBeforeOwnerCustodySettlement = netProfitBeforeDriverFee - details.driverFee;
            const finalNetProfitAfterOwnerCustodySettlement = profitBeforeOwnerCustodySettlement - details.custodyOwner;

            return (
              <div key={`profit-loss-print-${targetCurrency}`} className="p-4 bg-muted/30 rounded-lg shadow border">
                <h4 className="font-bold text-lg mb-3 text-center border-b pb-2">
                  تفصيل العمليات بالـ{currencyName}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span><Receipt className="inline h-4 w-4 me-1 text-primary" />إجمالي إيرادات الرحلات والعهد من العملاء:</span>
                    {formatCurrencyDisplayPrint(details.revenueAndClientCustody, targetCurrency, 'positive')}
                  </div>
                  {renderItemizedTransactionDetailBreakdownPrint(details.revenueAndClientCustodyDetails, targetCurrency)}

                  <div className="flex justify-between items-center mt-2">
                    <span><Landmark className="inline h-4 w-4 me-1 text-primary" />يُضاف: العهدة المستلمة من المالك:</span>
                    {formatCurrencyDisplayPrint(details.custodyOwner, targetCurrency, 'positive')}
                  </div>
                  {renderItemizedTransactionDetailBreakdownPrint(details.custodyOwnerDetails, targetCurrency)}

                  <Separator className="my-2.5" />
                  <div className="flex justify-between items-center font-semibold">
                    <span>المجموع الفرعي (الإيرادات والعهد الإجمالية):</span>
                    {formatCurrencyDisplayPrint(totalInitialIncomeAndCustody, targetCurrency, 'default')}
                  </div>
                  <Separator className="my-2.5" />

                  <div className="flex justify-between items-center">
                    <span><ShoppingCart className="inline h-4 w-4 me-1 text-primary" />يُطرح: إجمالي المصروفات:</span>
                    {formatCurrencyDisplayPrint(details.expense, targetCurrency, 'negative')}
                  </div>
                  {renderAggregatedTransactionDetailBreakdownPrint(details.expenseDetails, targetCurrency)}
                  <Separator className="my-2.5" />

                  <div className="flex justify-between items-center font-semibold">
                    <span>صافي الربح قبل أجرة السائق:</span>
                    {formatCurrencyDisplayPrint(netProfitBeforeDriverFee, targetCurrency, 'default')}
                  </div>
                  <Separator className="my-2.5" />

                  <div className="flex justify-between items-center">
                    <span><HandCoins className="inline h-4 w-4 me-1 text-primary" />يُطرح: أجرة السائق:</span>
                    {formatCurrencyDisplayPrint(details.driverFee, targetCurrency, 'negative')}
                  </div>
                  {renderAggregatedTransactionDetailBreakdownPrint(details.driverFeeDetails, targetCurrency)}
                  <Separator className="my-3 border-primary/50" />

                  <div className="flex justify-between items-center text-md pt-1 font-semibold">
                    <span>الربح/الخسارة التشغيلية (قبل تسوية عهدة المالك):</span>
                    {formatCurrencyDisplayPrint(profitBeforeOwnerCustodySettlement, targetCurrency, 'default')}
                  </div>
                  <Separator className="my-2.5" />
                  
                  <div className="flex justify-between items-center">
                    <span><Landmark className="inline h-4 w-4 me-1 text-primary"/>يُخصم: عهدة المالك (لتسوية الربح):</span>
                    {formatCurrencyDisplayPrint(details.custodyOwner, targetCurrency, 'negative')}
                  </div>
                   {renderItemizedTransactionDetailBreakdownPrint(details.custodyOwnerDetails, targetCurrency)}
                  <Separator className="my-3 border-accent" />
                                
                  <div className="flex justify-between items-center text-lg pt-1 font-bold">
                    <span className="text-primary">صافي ربح/خسارة الرحلة النهائي (بعد تسوية عهدة المالك):</span>
                    {formatCurrencyDisplayPrint(finalNetProfitAfterOwnerCustodySettlement, targetCurrency, 'default')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
