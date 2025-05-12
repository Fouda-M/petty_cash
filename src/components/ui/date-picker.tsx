
"use client"

import * as React from "react"
import { format } from "date-fns"
import { arSA } from "date-fns/locale"; // Import Arabic locale
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  setDate: (date?: Date) => void
  disabled?: (date: Date) => boolean
}

export function DatePicker({ date, setDate, disabled }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-start font-normal", // Changed text-left to text-start
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="ml-2 h-4 w-4" /> {/* Changed mr-2 to ml-2 */}
          {date ? format(date, "PPP", { locale: arSA }) : <span>اختر تاريخًا</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" dir="ltr"> {/* Explicitly set dir to ltr for calendar popover if needed for date-fns calendar */}
        <Calendar
          locale={arSA} // Pass locale to Calendar component
          mode="single"
          selected={date}
          onSelect={setDate}
          disabled={disabled}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
