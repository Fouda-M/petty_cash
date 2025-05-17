
"use client";

import * as React from "react";
import type { Transaction, ExchangeRates } from "@/types";
import type { TripDetailsFormData } from "@/lib/schemas"; // Import TripDetailsFormData
import { TransactionType } from "@/types";
import { Currency, CURRENCIES_INFO, CONVERSION_TARGET_CURRENCIES, getCurrencyInfo } from "@/lib/constants";
import { convertCurrency, getExchangeRate } from "@/lib/exchangeRates";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";

interface PrintableReportProps {
  transactions: Transaction[];
  exchangeRates: ExchangeRates;
  tripDetails: TripDetailsFormData | null; // Add tripDetails prop
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

const formatAmountForPrint = (amount: number) => {
  return amount.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatCurrencyDisplayPrint = (
  amount: number,
  currencyCode: Currency,
  coloration: 'positive' | 'negative' | 'neutral' = 'neutral'
) => {
  const currencyInfo = getCurrencyInfo(currencyCode);
  const displayAmount = formatAmountForPrint(amount);

  let amountClass = "print-text-neutral";
  if (coloration === 'positive') {
    amountClass = "print-text-positive";
  } else if (coloration === 'negative') {
    amountClass = "print-text-negative";
  }

  return (
    <span className={cn(amountClass, "font-semibold")}>
      {(currencyInfo?.symbol || currencyCode)}{displayAmount}
    </span>
  );
};


export default function PrintableReport({ transactions, exchangeRates, tripDetails }: PrintableReportProps) {
  const [reportGeneratedDate, setReportGeneratedDate] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setReportGeneratedDate(new Date());
  }, []);

  const aggregatedExpenses = React.useMemo(() => {
    const expensesByCurrency: Record<
      string,
      { total: number; details: { description: string; amount: number }[] }
    > = {};

    transactions
      .filter((t) => t.type === TransactionType.EXPENSE)
      .forEach((t) => {
        if (!expensesByCurrency[t.currency]) {
          expensesByCurrency[t.currency] = { total: 0, details: [] };
        }
        expensesByCurrency[t.currency].total += t.amount;
        expensesByCurrency[t.currency].details.push({
          description: t.description,
          amount: t.amount,
        });
      });
    return expensesByCurrency;
  }, [transactions]);

  const tripProfitLossSummaryForPrint = React.useMemo(() => {
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
        const type = t.type;
        const convertedAmount = convertCurrency(t.amount, t.currency, targetCurrency, exchangeRates);
        const detail: TransactionDetailPrint = {
          originalCurrency: t.currency,
          originalAmount: t.amount,
          convertedAmount: convertedAmount,
          type: t.type,
        };

        if (type === TransactionType.REVENUE || type === TransactionType.CUSTODY_HANDOVER_CLIENT) {
          totalConvertedRevenueAndClientCustody += convertedAmount;
          revenueAndClientCustodyDetailsForTarget.push(detail);
        } else if (type === TransactionType.EXPENSE) {
          totalConvertedExpenses += convertedAmount;
          expenseDetailsForTarget.push(detail);
        } else if (type === TransactionType.CUSTODY_HANDOVER_OWNER) {
          totalConvertedCustodyOwner += convertedAmount;
          custodyOwnerDetailsForTarget.push(detail);
        } else if (type === TransactionType.DRIVER_FEE) {
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
  }, [transactions, exchangeRates]);

  const renderItemizedTransactionDetailBreakdownPrint = (details: TransactionDetailPrint[], targetCurrency: Currency) => {
    if (details.length === 0) return <div className="ps-6 pe-2 mt-1 text-xs text-gray-500">لا توجد تفاصيل لهذه الفئة.</div>;
    return (
      <div className="ps-6 pe-2 mt-1 text-xs text-gray-600 space-y-0.5 border-s border-dashed border-gray-300 ms-2">
        {details.map((detail, index) => {
          let prefix = "↳ من";
          if (detail.type === TransactionType.CUSTODY_HANDOVER_CLIENT) prefix = "↳ عهدة عميل من";
          else if (detail.type === TransactionType.REVENUE) prefix = "↳ إيراد من";
          else if (detail.type === TransactionType.CUSTODY_HANDOVER_OWNER) prefix = "↳ عهدة مالك من";

          return (
            <div key={index} className="flex justify-between items-center py-0.5">
              <span className="whitespace-nowrap">{prefix} {getCurrencyInfo(detail.originalCurrency)?.name || detail.originalCurrency}: {formatCurrencyDisplayPrint(detail.originalAmount, detail.originalCurrency, 'neutral')}</span>
              <span className="whitespace-nowrap text-end">
                (يعادل {formatCurrencyDisplayPrint(detail.convertedAmount, targetCurrency, 'neutral')}{' '}
                <span className="text-xs text-gray-500" dir="ltr">
                  @{getExchangeRate(detail.originalCurrency, targetCurrency, exchangeRates).toFixed(4)}
                </span>)
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAggregatedTransactionDetailBreakdownPrint = (details: TransactionDetailPrint[], targetCurrency: Currency) => {
    if (details.length === 0) return <div className="ps-6 pe-2 mt-1 text-xs text-gray-500">لا توجد تفاصيل لهذه الفئة.</div>;
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
      <div className="ps-6 pe-2 mt-1 text-xs text-gray-600 space-y-0.5 border-s border-dashed border-gray-300 ms-2">
        {Array.from(aggregated.entries()).map(([originalCurrency, totals], index) => (
          <div key={index} className="flex justify-between items-center py-0.5">
            <span className="whitespace-nowrap">↳ منها بالـ{getCurrencyInfo(originalCurrency)?.name || originalCurrency}: {formatCurrencyDisplayPrint(totals.totalOriginal, originalCurrency, 'neutral')}</span>
            <span className="whitespace-nowrap text-end">
              (يعادل {formatCurrencyDisplayPrint(totals.totalConverted, targetCurrency, 'neutral')}{' '}
              <span className="text-xs text-gray-500" dir="ltr">
                @{getExchangeRate(originalCurrency, targetCurrency, exchangeRates).toFixed(4)}
              </span>)
            </span>
          </div>
        ))}
      </div>
    );
  };


  return (
    <div id="printable-content" className="p-4 bg-white text-black" dir="rtl">
      <h1 className="printable-title text-center mb-2">تقرير المعاملات والربحية</h1>
      {tripDetails && (
        <div className="text-center mb-2 text-sm text-gray-700">
            <p><strong>السائق:</strong> {tripDetails.driverName}</p>
            <p><strong>الوجهة:</strong> {tripDetails.destinationType === "INTERNAL" ? tripDetails.cityName : tripDetails.countryName}</p>
            <p>
                <strong>الفترة:</strong> من {format(new Date(tripDetails.tripStartDate), "PP", { locale: arSA })} إلى {format(new Date(tripDetails.tripEndDate), "PP", { locale: arSA })}
            </p>
        </div>
      )}
      {reportGeneratedDate && (
        <p className="text-xs text-gray-500 mb-4 text-center">
          تاريخ إنشاء التقرير: {format(reportGeneratedDate, "PPPpp", { locale: arSA })}
        </p>
      )}

      <section className="mb-6">
        <h2 className="printable-section-title">ملخص المصروفات المفصل حسب العملة</h2>
        {Object.keys(aggregatedExpenses).length > 0 ? (
          Object.entries(aggregatedExpenses).map(([currencyCode, data]) => (
            <div key={currencyCode} className="mb-4 p-3 printable-card">
              <h3 className="font-semibold text-base mb-1.5">
                المصروفات بعملة: {getCurrencyInfo(currencyCode as Currency)?.name || currencyCode}
              </h3>
              <table className="printable-table">
                <thead>
                  <tr>
                    <th>الوصف</th>
                    <th className="text-end">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.details.map((item, index) => (
                    <tr key={index}>
                      <td>{item.description}</td>
                      <td className="text-end">{formatCurrencyDisplayPrint(item.amount, currencyCode as Currency, 'negative')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="font-bold">إجمالي المصروفات بـ{getCurrencyInfo(currencyCode as Currency)?.symbol || currencyCode}</td>
                    <td className="text-end font-bold">{formatCurrencyDisplayPrint(data.total, currencyCode as Currency, 'negative')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))
        ) : (
          <p className="text-gray-600">لا توجد مصروفات مسجلة.</p>
        )}
      </section>

      <section>
        <h2 className="printable-section-title">ملخص ربحية الرحلات (معادل)</h2>
        {CONVERSION_TARGET_CURRENCIES.map(targetCurrency => {
          const details = tripProfitLossSummaryForPrint[targetCurrency];
          if (!details) return null;
          const currencyName = getCurrencyInfo(targetCurrency)?.name || targetCurrency;

          const totalInitialIncomeAndCustody = details.revenueAndClientCustody + details.custodyOwner;
          const netProfitBeforeDriverFee = totalInitialIncomeAndCustody - details.expense;
          const profitBeforeOwnerCustodySettlement = netProfitBeforeDriverFee - details.driverFee;
          const finalNetProfitAfterOwnerCustodySettlement = profitBeforeOwnerCustodySettlement - details.custodyOwner;

          return (
            <div key={`profit-loss-print-${targetCurrency}`} className="mb-6 p-3 printable-card">
              <h3 className="font-semibold text-base mb-2 text-center border-b pb-1.5 border-gray-300">
                تفصيل العمليات بالـ{currencyName}
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span>إجمالي إيرادات الرحلات والعهد من العملاء:</span>
                  {formatCurrencyDisplayPrint(details.revenueAndClientCustody, targetCurrency, 'positive')}
                </div>
                {renderItemizedTransactionDetailBreakdownPrint(details.revenueAndClientCustodyDetails, targetCurrency)}

                <div className="flex justify-between items-center mt-1.5">
                  <span>يُضاف: العهدة المستلمة من المالك:</span>
                  {formatCurrencyDisplayPrint(details.custodyOwner, targetCurrency, 'positive')}
                </div>
                {renderItemizedTransactionDetailBreakdownPrint(details.custodyOwnerDetails, targetCurrency)}

                <hr className="my-2 border-gray-300" />
                <div className="flex justify-between items-center font-semibold">
                  <span>المجموع الفرعي (الإيرادات والعهد الإجمالية):</span>
                  {formatCurrencyDisplayPrint(totalInitialIncomeAndCustody, targetCurrency, 'neutral')}
                </div>
                <hr className="my-2 border-gray-300" />

                <div className="flex justify-between items-center">
                  <span>يُطرح: إجمالي المصروفات:</span>
                  {formatCurrencyDisplayPrint(details.expense, targetCurrency, 'negative')}
                </div>
                {renderAggregatedTransactionDetailBreakdownPrint(details.expenseDetails, targetCurrency)}

                <hr className="my-2 border-gray-300" />
                <div className="flex justify-between items-center font-semibold">
                  <span>صافي الربح قبل أجرة السائق:</span>
                  {formatCurrencyDisplayPrint(netProfitBeforeDriverFee, targetCurrency, 'neutral')}
                </div>
                <hr className="my-2 border-gray-300" />

                <div className="flex justify-between items-center">
                  <span>يُطرح: أجرة السائق:</span>
                  {formatCurrencyDisplayPrint(details.driverFee, targetCurrency, 'negative')}
                </div>
                {renderAggregatedTransactionDetailBreakdownPrint(details.driverFeeDetails, targetCurrency)}

                <hr className="my-2.5 border-gray-400" />
                <div className="flex justify-between items-center text-sm pt-0.5 font-semibold">
                  <span>الربح/الخسارة التشغيلية (قبل تسوية عهدة المالك):</span>
                  {formatCurrencyDisplayPrint(profitBeforeOwnerCustodySettlement, targetCurrency, 'neutral')}
                </div>
                <hr className="my-2 border-gray-300" />

                <div className="flex justify-between items-center">
                  <span>يُخصم: عهدة المالك (لتسوية الربح):</span>
                  {formatCurrencyDisplayPrint(details.custodyOwner, targetCurrency, 'negative')}
                </div>
                {renderItemizedTransactionDetailBreakdownPrint(details.custodyOwnerDetails, targetCurrency)}

                <hr className="my-2.5 border-gray-500" />
                <div className="flex justify-between items-center text-base pt-0.5 font-bold">
                  <span>صافي ربح/خسارة الرحلة النهائي (بعد تسوية عهدة المالك):</span>
                  {formatCurrencyDisplayPrint(finalNetProfitAfterOwnerCustodySettlement, targetCurrency, 'neutral')}
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
