
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
import { Currency, CURRENCIES_INFO } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw } from "lucide-react"; // Removed CalendarIcon, kept RefreshCw for potential future use if re-enabled
import { DatePicker } from "@/components/ui/date-picker"; // Kept for UI consistency if needed later
import { format } from "date-fns";


interface ExchangeRateManagerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentRates: ExchangeRates;
  onRatesUpdate: (newRates: ExchangeRates) => void;
}

// Static exchange rates as per prompt
const staticExchangeRatesFromPrompt = { USD: 1.0, EUR: 0.92, GBP: 0.79 };


export default function ExchangeRateManager({
  isOpen,
  onOpenChange,
  currentRates,
  onRatesUpdate,
}: ExchangeRateManagerProps) {
  const [editableRateStrings, setEditableRateStrings] = React.useState<Record<string, string>>(() => {
    const initialStrings: Record<string, string> = {};
    for (const currencyInfo of CURRENCIES_INFO) {
      initialStrings[currencyInfo.code] = currentRates[currencyInfo.code]?.toString() || "";
    }
    // Ensure static rates from prompt are also initialized if not in currentRates (though they should be)
    // This part might be redundant if currentRates is always comprehensive
    for (const key in staticExchangeRatesFromPrompt) {
        if (!initialStrings[key as Currency]) {
            initialStrings[key as Currency] = staticExchangeRatesFromPrompt[key as keyof typeof staticExchangeRatesFromPrompt].toString();
        }
    }
    return initialStrings;
  });

  const [isSaving, setIsSaving] = React.useState(false);
  // State related to fetching rates dynamically - kept for UI consistency but functionality disabled
  const [isFetchingRates, setIsFetchingRates] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const [fetchStatus, setFetchStatus] = React.useState<string>("جلب أسعار الصرف الديناميكي معطل حاليًا. يتم استخدام أسعار ثابتة.");
  const { toast } = useToast();

  React.useEffect(() => {
    if (isOpen) {
      const updatedStrings: Record<string, string> = {};
      let usingStaticFallback = false;

      for (const currencyInfo of CURRENCIES_INFO) {
        let rateToSet = currentRates[currencyInfo.code]?.toString();
        
        // If rate for a standard currency is missing in currentRates, try to use prompt's static rates
        if (!rateToSet && staticExchangeRatesFromPrompt.hasOwnProperty(currencyInfo.code)) {
            rateToSet = staticExchangeRatesFromPrompt[currencyInfo.code as keyof typeof staticExchangeRatesFromPrompt].toString();
            usingStaticFallback = true;
        }
        
        updatedStrings[currencyInfo.code] = rateToSet || "";
      }
      
      // Ensure USD is always 1
      updatedStrings[Currency.USD] = "1";

      setEditableRateStrings(updatedStrings);
      setSelectedDate(undefined);
      setFetchStatus(usingStaticFallback 
        ? "بعض الأسعار تم تحميلها من القيم الثابتة الافتراضية. جلب الأسعار الديناميكي معطل."
        : "جلب أسعار الصرف الديناميكي معطل. يتم استخدام الأسعار الحالية أو الثابتة.");
    }
  }, [currentRates, isOpen]);
 
  const handleRateInputChange = (currency: Currency, value: string) => {
    setEditableRateStrings((prev) => ({ ...prev, [currency]: value }));
  };

  const handleFetchRates = async () => {
    // Genkit functionality is removed, so this button is now for illustrative purposes or future re-enablement.
    toast({
      title: "جلب أسعار الصرف معطل",
      description: "تم تعطيل ميزة جلب أسعار الصرف تلقائيًا. يرجى إدخال الأسعار يدويًا أو استخدام الأسعار الثابتة.",
    });
    setFetchStatus("جلب الأسعار الديناميكي معطل. يرجى استخدام القيم المدخلة أو الثابتة.");
  };

  const handleSave = () => {
    setIsSaving(true);
    const newRates: ExchangeRates = {} as ExchangeRates; // Initialize as empty
    let allValid = true;

    for (const currencyInfo of CURRENCIES_INFO) {
      const code = currencyInfo.code;
      if (code === Currency.USD) {
        newRates[Currency.USD] = 1;
        continue;
      }
      const stringValue = editableRateStrings[code];
      const numValue = parseFloat(stringValue);

      if (stringValue && stringValue.trim() !== "" && !isNaN(numValue) && numValue > 0) {
        newRates[code] = numValue;
      } else if (staticExchangeRatesFromPrompt.hasOwnProperty(code)) { 
        // Fallback to prompt's static rates if input is invalid or empty for known static currencies
        newRates[code] = staticExchangeRatesFromPrompt[code as keyof typeof staticExchangeRatesFromPrompt];
        toast({
            variant: "default", // Use default variant for informational messages
            title: `ملاحظة لسعر ${currencyInfo.name}`,
            description: `تم استخدام السعر الثابت (${newRates[code]}) لـ ${currencyInfo.name} بسبب قيمة غير صالحة أو فارغة.`,
        });
      } else if (currentRates[code]) {
        // Fallback to originally loaded currentRates if still no valid input and not in prompt's static
        newRates[code] = currentRates[code];
         toast({
            variant: "default",
            title: `ملاحظة لسعر ${currencyInfo.name}`,
            description: `تم الإبقاء على السعر السابق (${newRates[code]}) لـ ${currencyInfo.name} بسبب قيمة غير صالحة أو فارغة.`,
        });
      }
       else {
        // If no valid input, no static fallback, and no currentRate, it's an issue for non-USD
        allValid = false; // Consider it invalid if a rate can't be determined for non-USD
        toast({
          variant: "destructive",
          title: "خطأ في سعر الصرف",
          description: `سعر الصرف لـ ${currencyInfo.name} غير صالح أو مفقود. يجب أن يكون رقمًا موجبًا.`,
        });
        setIsSaving(false);
        return;
      }
    }
    
    // Final check for USD, should always be 1
    newRates[Currency.USD] = 1;


    if (allValid) {
      onRatesUpdate(newRates);
      toast({
        title: "تم حفظ أسعار الصرف",
        description: "تم تحديث أسعار الصرف بنجاح.",
      });
      onOpenChange(false);
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إدارة أسعار الصرف (مقابل الدولار الأمريكي)</DialogTitle>
          <DialogDescription>
            أسعار الصرف الديناميكية معطلة. أدخل الأسعار يدويًا أو اعتمد على القيم الثابتة الافتراضية. الدولار الأمريكي ثابت عند 1.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 my-3">
          <div className="space-y-2">
            <Label htmlFor="fetch-date">تاريخ أسعار الصرف (للعرض فقط)</Label>
            <DatePicker date={selectedDate} setDate={setSelectedDate} disabled={() => true} />
          </div>
          <Button 
              type="button" 
              onClick={handleFetchRates} 
              disabled={true} // Feature disabled
              variant="outline" 
              className="w-full"
          >
              <RefreshCw className="ms-2 h-4 w-4" />
              جلب أحدث أسعار الصرف (معطل)
          </Button>
          {fetchStatus && <p className="text-sm text-muted-foreground text-center">{fetchStatus}</p>}
        </div>

        <div className="space-y-4 py-2 max-h-[calc(50vh-120px)] overflow-y-auto px-1">
          {CURRENCIES_INFO.map((currencyInfo) => (
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
                placeholder="0.00000"
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

