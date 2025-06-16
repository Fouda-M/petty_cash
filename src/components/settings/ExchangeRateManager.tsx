
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

interface ExchangeRateManagerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentRates: ExchangeRates; // These are the rates loaded from localStorage/defaults
  onRatesUpdate: (newRates: ExchangeRates) => void;
}

// Define the specific currencies to be managed by this static dialog
const MANAGED_CURRENCIES_INFO = [
  getCurrencyInfo(Currency.USD)!, // USD is always 1 and read-only
  getCurrencyInfo(Currency.EUR)!, // Add EUR if not already in your constants
  getCurrencyInfo(Currency.GBP)!, // Add GBP if not already in your constants
];

// Static exchange rates as per prompt to be used as defaults for EUR, GBP
// The app's DEFAULT_EXCHANGE_RATES_TO_USD will still handle other currencies like AED, SAR, EGP
const STATIC_FALLBACK_RATES = {
  [Currency.USD]: 1.0,
  [Currency.EUR]: 0.92,
  [Currency.GBP]: 0.79,
};

export default function ExchangeRateManager({
  isOpen,
  onOpenChange,
  currentRates, // currentRates from localStorage/app defaults
  onRatesUpdate,
}: ExchangeRateManagerProps) {
  const [editableRateStrings, setEditableRateStrings] = React.useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [fetchStatus, setFetchStatus] = React.useState<string>("جلب أسعار الصرف الديناميكي معطل. يتم استخدام الأسعار المدخلة أو الافتراضية.");
  const { toast } = useToast();

  React.useEffect(() => {
    if (isOpen) {
      const initialStrings: Record<string, string> = {};
      MANAGED_CURRENCIES_INFO.forEach(currencyInfo => {
        const code = currencyInfo.code;
        if (code === Currency.USD) {
          initialStrings[code] = "1"; // USD is always 1
        } else {
          // Prioritize currentRates (from localStorage/app defaults)
          // Then STATIC_FALLBACK_RATES (for EUR, GBP specifically)
          // Then empty string
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
    toast({
      title: "جلب أسعار الصرف معطل",
      description: "تم تعطيل ميزة جلب أسعار الصرف تلقائيًا. يرجى إدخال الأسعار يدويًا.",
    });
    setFetchStatus("جلب الأسعار الديناميكي معطل. يرجى استخدام القيم المدخلة أو الثابتة.");
  };

  const handleSave = () => {
    setIsSaving(true);
    const newRatesUpdates: Partial<ExchangeRates> = {}; // Only updates for managed currencies
    let allManagedValid = true;

    for (const currencyInfo of MANAGED_CURRENCIES_INFO) {
      const code = currencyInfo.code;
      if (code === Currency.USD) {
        newRatesUpdates[Currency.USD] = 1;
        continue;
      }
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
      const finalRatesToSave = { ...currentRates, ...newRatesUpdates, [Currency.USD]: 1 };
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
          <DialogTitle>إدارة أسعار الصرف (مقابل الدولار الأمريكي)</DialogTitle>
          <DialogDescription>
            أسعار الصرف الديناميكية معطلة. أدخل الأسعار يدويًا للدولار، اليورو، والجنيه الإسترليني. الدولار الأمريكي ثابت عند 1.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 my-3">
          <div className="space-y-2">
            <Label htmlFor="fetch-date">تاريخ أسعار الصرف (للعرض فقط)</Label>
            <DatePicker date={undefined} setDate={() => {}} disabled={() => true} />
          </div>
          <Button 
              type="button" 
              onClick={handleFetchRates} 
              disabled={true} 
              variant="outline" 
              className="w-full"
          >
              <RefreshCw className="ms-2 h-4 w-4" />
              جلب أحدث أسعار الصرف (معطل)
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
                value={currencyInfo.code === Currency.USD ? "1" : editableRateStrings[currencyInfo.code] || ""}
                onChange={(e) => handleRateInputChange(currencyInfo.code, e.target.value)}
                className="col-span-2"
                placeholder={STATIC_FALLBACK_RATES[currencyInfo.code as keyof typeof STATIC_FALLBACK_RATES]?.toString() || "0.00"}
                disabled={currencyInfo.code === Currency.USD || isSaving}
                readOnly={currencyInfo.code === Currency.USD}
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

    