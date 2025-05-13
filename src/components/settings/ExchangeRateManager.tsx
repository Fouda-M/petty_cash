
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
import { Loader2 } from "lucide-react";

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
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
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
