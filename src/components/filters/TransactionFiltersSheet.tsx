"use client";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CalendarIcon, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import * as React from "react";
import { DateRange } from "react-day-picker";
import { ar } from "date-fns/locale";
import { TransactionFilters } from "@/hooks/useTransactions";

interface Props {
  filters: TransactionFilters;
  onChange(filters: TransactionFilters): void;
}

export default function TransactionFiltersSheet({ filters, onChange }: Props) {
  const [open, setOpen] = React.useState(false);
  const [range, setRange] = React.useState<DateRange | undefined>();

  const apply = () => {
    onChange({
      ...filters,
      startDate: range?.from?.toISOString(),
      endDate: range?.to?.toISOString(),
    });
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Filter className="w-4 h-4" /> فلاتر
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 sm:w-96">
        <h2 className="text-lg font-semibold mb-4">الفلاتر</h2>
        {/* Date range */}
        <div className="space-y-2 mb-6">
          <label className="text-sm font-medium">الفترة</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start gap-2">
                <CalendarIcon className="w-4 h-4" />
                {range?.from ? (
                  <span>
                    {format(range.from, "dd/MM/yyyy", { locale: ar })} - {range.to ? format(range.to, "dd/MM/yyyy", { locale: ar }) : "..."}
                  </span>
                ) : (
                  <span>اختر نطاقاً</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0" side="bottom" align="start">
              <div className="p-3">
                <Input
                  type="date"
                  value={range?.from ? range.from.toISOString().substring(0, 10) : ""}
                  onChange={(e) => {
                    const d = new Date(e.target.value);
                    setRange((prev) => ({ from: d, to: prev?.to } as DateRange));
                  }}
                />
                <Input
                  type="date"
                  className="mt-2"
                  value={range?.to ? range.to.toISOString().substring(0, 10) : ""}
                  onChange={(e) => {
                    const d = new Date(e.target.value);
                    setRange((prev) => ({ from: prev?.from, to: d } as DateRange));
                  }}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {/* Search */}
        <div className="space-y-2 mb-6">
          <label className="text-sm font-medium">بحث</label>
          <Input
            placeholder="كلمة مفتاحية..."
            value={filters.search ?? ""}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
          />
        </div>
        <Button className="w-full" onClick={apply}>تطبيق</Button>
      </SheetContent>
    </Sheet>
  );
}
