"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ExchangeRates } from "@/types";
import { Currency, getCurrencyInfo } from "@/lib/constants"; // Removed CURRENCIES_INFO
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker"; // Kept for UI consistency if needed later
import { fetchRatesToEGP } from "@/lib/fetchRates";
import { saveExchangeRates } from "@/lib/exchangeRates";

interface ExchangeRateManagerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentRates: ExchangeRates; 
  onRatesUpdate: (newRates: ExchangeRates) => void;
}

const MANAGED_CURRENCIES_INFO = [
  getCurrencyInfo(Currency.EGP)!, 
  getCurrencyInfo(Currency.USD)!, 
  getCurrencyInfo(Currency.SAR)!, 
  getCurrencyInfo(Currency.AED)!, 
  getCurrencyInfo(Currency.JOD)!, 
  getCurrencyInfo(Currency.SYP)!, 
  getCurrencyInfo(Currency.SDG)!,
];

const STATIC_FALLBACK_RATES = {
  [Currency.EGP]: 1.0,
  [Currency.USD]: 30, 
  [Currency.SAR]: 8,
  [Currency.AED]: 8.3,
  [Currency.JOD]: 42,
  [Currency.SYP]: 0.006,
  [Currency.SDG]: 0.09,
};

export default function ExchangeRateManager({
  isOpen,
  onOpenChange,
  currentRates, 
  onRatesUpdate,
}: ExchangeRateManagerProps) {
  const [editableRateStrings, setEditableRateStrings] = React.useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [isFetching, setIsFetching] = React.useState(false);
  const [fetchStatus, setFetchStatus] = React.useState<string>("يمكنك جلب أسعار الصرف مقابل الجنيه المصري أو تعديلها يدوياً.");
  const [rateDate, setRateDate] = React.useState<Date | undefined>(new Date());
  const { toast } = useToast();

  React.useEffect(() => {
    if (isOpen) {
      const initialStrings: Record<string, string> = {};
      MANAGED_CURRENCIES_INFO.forEach(currencyInfo => {
        const code = currencyInfo.code;
        if (code === Currency.EGP) {
          initialStrings[code] = "1" 
        } else {
          initialStrings[code] = 
            currentRates[code]?.toString() || 
            STATIC_FALLBACK_RATES[code as keyof typeof STATIC_FALLBACK_RATES]?.toString() || 
            "";
        }
      });
      setEditableRateStrings(initialStrings);
      setFetchStatus("أسعار الصرف المعروضة هي للتحرير اليدوي. جلب الأسعار الديناميكي معطل.");
    }
  }, [currentRates, isOpen]);
 
  const handleRateInputChange = (currency: Currency, value: string) => {
    setEditableRateStrings((prev) => ({ ...prev, [currency]: value }));
  };

  const handleFetchRates = async () => {
  setIsFetching(true);
  try {
    const egpRates = await fetchRatesToEGP();
    const updated: Partial<ExchangeRates> = {
      [Currency.USD]: egpRates[Currency.USD] ?? currentRates[Currency.USD],
      [Currency.SAR]: egpRates[Currency.SAR] ?? currentRates[Currency.SAR],
      [Currency.AED]: egpRates[Currency.AED] ?? currentRates[Currency.AED],
      [Currency.JOD]: egpRates[Currency.JOD] ?? currentRates[Currency.JOD],
      [Currency.SYP]: egpRates[Currency.SYP] ?? currentRates[Currency.SYP],
      [Currency.SDG]: egpRates[Currency.SDG] ?? currentRates[Currency.SDG],
    };
    // Always ensure EGP base is 1
    updated[Currency.EGP] = 1;

    // Merge with existing and persist
    const mergedRates = { ...currentRates, ...updated } as ExchangeRates;
    saveExchangeRates(mergedRates);
    onRatesUpdate(mergedRates);

    setEditableRateStrings((prev) => ({
      ...prev,
      [Currency.USD]: mergedRates[Currency.USD].toString(),
      [Currency.SAR]: mergedRates[Currency.SAR].toString(),
      [Currency.AED]: mergedRates[Currency.AED].toString(),
      [Currency.JOD]: mergedRates[Currency.JOD].toString(),
      [Currency.SYP]: mergedRates[Currency.SYP].toString(),
      [Currency.SDG]: mergedRates[Currency.SDG].toString(),
    }));
    setFetchStatus("تم جلب أسعار الصرف بنجاح.");
    toast({ title: "تم التحديث", description: "تم جلب أحدث أسعار الصرف." });

        


    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "خطأ", description: "فشل جلب الأسعار. تأكد من الاتصال بالإنترنت." });
      setFetchStatus("فشل جلب الأسعار. استخدم القيم الحالية.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    const newRatesUpdates: Partial<ExchangeRates> = {}; // Only updates for managed currencies
    let allManagedValid = true;

    for (const currencyInfo of MANAGED_CURRENCIES_INFO) {
    if (currencyInfo.code === Currency.EGP) {
      // Skip EGP, always 1
      continue;
    }
      const code = currencyInfo.code;
      const stringValue = editableRateStrings[code];
      const numValue = parseFloat(stringValue);

      if (stringValue && stringValue.trim() !== "" && !isNaN(numValue) && numValue > 0) {
        newRatesUpdates[code] = numValue;
      } else {
        // If input for managed currency is invalid, revert to its known static fallback or current prop value
        const fallbackRate = STATIC_FALLBACK_RATES[code as keyof typeof STATIC_FALLBACK_RATES] || currentRates[code];
        if (fallbackRate && fallbackRate > 0) {
            newRatesUpdates[code] = fallbackRate;
            toast({
                variant: "default",
                title: `ملاحظة لسعر ${currencyInfo.name}`,
                description: `تم استخدام السعر السابق/الافتراضي (${fallbackRate}) لـ ${currencyInfo.name} بسبب قيمة غير صالحة أو فارغة.`,
            });
        } else {
            allManagedValid = false;
            toast({
              variant: "destructive",
              title: "خطأ في سعر الصرف",
              description: `سعر الصرف لـ ${currencyInfo.name} غير صالح أو مفقود ولا يوجد احتياطي. يجب أن يكون رقمًا موجبًا.`,
            });
            setIsSaving(false);
            return;
        }
      }
    }
    
    if (allManagedValid) {
      // Merge updates with existing rates, ensuring unmanaged currencies are preserved
      const finalRatesToSave = { ...currentRates, ...newRatesUpdates, [Currency.EGP]: 1 };
      onRatesUpdate(finalRatesToSave);
      toast({
        title: "تم حفظ أسعار الصرف",
        description: "تم تحديث أسعار الصرف بنجاح.",
      });
      onOpenChange(false);
    }
    setIsSaving(false);
  };

  // Ensure EUR and GBP are in CURRENCIES_INFO if they are to be managed
  // This check is conceptual; your CURRENCIES_INFO should be comprehensive.
  // For this component, we are explicitly listing USD, EUR, GBP if MANAGED_CURRENCIES_INFO is used.
  // We need to ensure getCurrencyInfo(Currency.EUR) and getCurrencyInfo(Currency.GBP) return valid CurrencyInfo.
  // If EUR/GBP are not in your `src/lib/constants.ts` `CURRENCIES_INFO` array, 
  // `getCurrencyInfo` would return undefined for them, and MANAGED_CURRENCIES_INFO would be incomplete.
  // Let's assume they are defined there for `getCurrencyInfo` to work.
  // If not, this component would need to hardcode their names/symbols or CURRENCIES_INFO needs update.
  // For now, proceeding with the assumption that getCurrencyInfo will resolve them.

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إدارة أسعار الصرف (مقابل الجنيه المصري)</DialogTitle>
          <DialogDescription>
            يمكنك تعديل أو جلب أسعار الصرف مقابل الجنيه المصري. قيمة الجنيه المصري ثابتة على 1.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 my-3">
          <div className="space-y-2">
            <Label htmlFor="fetch-date">تاريخ أسعار الصرف</Label>
            <DatePicker date={rateDate} setDate={setRateDate} />
          </div>
          <Button 
              type="button" 
              onClick={handleFetchRates} 
              disabled={isFetching} 
              variant="outline" 
              className="w-full"
          >
              {isFetching ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : <RefreshCw className="ms-2 h-4 w-4" />} 
              جلب أحدث أسعار الصرف
          </Button>
          {fetchStatus && <p className="text-sm text-muted-foreground text-center">{fetchStatus}</p>}
        </div>

        <div className="space-y-4 py-2 max-h-[calc(50vh-120px)] overflow-y-auto px-1">
          {MANAGED_CURRENCIES_INFO.filter(Boolean).map((currencyInfo) => ( // filter(Boolean) to remove undefined if getCurrencyInfo fails
            <div key={currencyInfo.code} className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor={`rate-${currencyInfo.code}`} className="col-span-1 text-sm">
                {currencyInfo.name} ({currencyInfo.symbol})
              </Label>
              <Input
                id={`rate-${currencyInfo.code}`}
                type="number"
                step="any"
                value={currencyInfo.code === Currency.EGP ? "1" : editableRateStrings[currencyInfo.code] || ""}
                onChange={(e) => handleRateInputChange(currencyInfo.code, e.target.value)}
                className="col-span-2"
                placeholder={STATIC_FALLBACK_RATES[currencyInfo.code as keyof typeof STATIC_FALLBACK_RATES]?.toString() || "0.00"}
                disabled={currencyInfo.code === Currency.EGP || isSaving}
                readOnly={currencyInfo.code === Currency.EGP}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSaving}>
              إلغاء
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
            حفظ الأسعار
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    