
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
import { Loader2, RefreshCw } from "lucide-react";
import { getLatestExchangeRates } from "@/ai/flows/get-latest-exchange-rates-flow";

interface ExchangeRateManagerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentRates: ExchangeRates;
  onRatesUpdate: (newRates: ExchangeRates) => void;
}

export default function ExchangeRateManager({
  isOpen,
  onOpenChange,
  currentRates,
  onRatesUpdate,
}: ExchangeRateManagerProps) {
  const [editableRateStrings, setEditableRateStrings] = React.useState<Record<Currency, string>>(() => {
    const initialStrings: Record<Currency, string> = {} as Record<Currency, string>;
    for (const currencyInfo of CURRENCIES_INFO) {
      initialStrings[currencyInfo.code] = currentRates[currencyInfo.code]?.toString() || "";
    }
    return initialStrings;
  });

  const [isSaving, setIsSaving] = React.useState(false);
  const [isFetchingRates, setIsFetchingRates] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (isOpen && currentRates) {
      const updatedStrings: Record<Currency, string> = {} as Record<Currency, string>;
      for (const currencyInfo of CURRENCIES_INFO) {
        updatedStrings[currencyInfo.code] = currentRates[currencyInfo.code]?.toString() || "";
      }
      setEditableRateStrings(updatedStrings);
    }
  }, [currentRates, isOpen]);

  const handleRateInputChange = (currency: Currency, value: string) => {
    setEditableRateStrings((prev) => ({ ...prev, [currency]: value }));
  };

  const handleFetchLatestRates = async () => {
    setIsFetchingRates(true);
    try {
      const fetchedRatesOutput = await getLatestExchangeRates(); // Call the Genkit flow
      
      const newRateStrings: Record<Currency, string> = {} as Record<Currency, string>;
      let allValidFromFlow = true;

      for (const currencyInfo of CURRENCIES_INFO) {
        const rateValue = fetchedRatesOutput[currencyInfo.code];
        if (rateValue !== undefined && typeof rateValue === 'number' && rateValue > 0) {
          newRateStrings[currencyInfo.code] = rateValue.toString();
        } else {
          console.warn(`Rate for ${currencyInfo.code} from flow was invalid or missing. Keeping current string value.`);
          newRateStrings[currencyInfo.code] = editableRateStrings[currencyInfo.code] || currentRates[currencyInfo.code]?.toString() || "";
          allValidFromFlow = false; 
        }
      }
      
      newRateStrings[Currency.USD] = "1"; // Ensure USD is 1

      setEditableRateStrings(newRateStrings);
      toast({
        title: allValidFromFlow ? "تم جلب أسعار الصرف" : "تم جلب بعض أسعار الصرف",
        description: allValidFromFlow ? "تم تحديث الحقول بأسعار الصرف الجديدة. راجعها ثم اضغط حفظ." : "بعض الأسعار لم يتم جلبها بشكل صحيح أو بقيت كما هي. راجعها ثم اضغط حفظ.",
      });

    } catch (error) {
      console.error("Error fetching latest exchange rates:", error);
      toast({
        variant: "destructive",
        title: "خطأ في جلب الأسعار",
        description: error instanceof Error ? error.message : "لم يتمكن من جلب أحدث أسعار الصرف.",
      });
    } finally {
      setIsFetchingRates(false);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    const newRates: ExchangeRates = { ...currentRates };
    let allValid = true;

    for (const currencyInfo of CURRENCIES_INFO) {
      if (currencyInfo.code === Currency.USD) {
        newRates[Currency.USD] = 1;
        continue;
      }
      const stringValue = editableRateStrings[currencyInfo.code];
      const numValue = parseFloat(stringValue);

      if (stringValue.trim() === "" || isNaN(numValue) || numValue <= 0) {
        allValid = false;
        toast({
          variant: "destructive",
          title: "خطأ في سعر الصرف",
          description: `سعر الصرف لـ ${currencyInfo.name} غير صالح. يجب أن يكون رقمًا موجبًا.`,
        });
        setIsSaving(false);
        return; 
      }
      newRates[currencyInfo.code] = numValue;
    }

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
            عدّل أسعار صرف العملات. السعر هو قيمة الوحدة الواحدة من العملة بالدولار الأمريكي. الدولار الأمريكي ثابت عند 1.
          </DialogDescription>
        </DialogHeader>

        <Button 
            type="button" 
            onClick={handleFetchLatestRates} 
            disabled={isFetchingRates || isSaving} 
            variant="outline" 
            className="w-full my-3" // Added margin
        >
            {isFetchingRates ? (
                <Loader2 className="ms-2 h-4 w-4 animate-spin" />
            ) : (
                <RefreshCw className="ms-2 h-4 w-4" />
            )}
            الحصول على أسعار الصرف بشكل تلقائي
        </Button>

        <div className="space-y-4 py-2 max-h-[calc(60vh-80px)] overflow-y-auto px-1"> {/* Adjusted max-h and py */}
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
                disabled={currencyInfo.code === Currency.USD || isSaving || isFetchingRates}
                readOnly={currencyInfo.code === Currency.USD}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSaving || isFetchingRates}>
              إلغاء
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={isSaving || isFetchingRates}>
            {(isSaving) && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
            حفظ الأسعار
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
