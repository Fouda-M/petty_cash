
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { tripDetailsSchema, type TripDetailsFormData } from "@/lib/schemas";
import { DestinationType } from "@/types";
import { Loader2 } from "lucide-react";
import { FormErrorIcon } from "@/components/ui/FormErrorIcon";
import { useHotkeys } from "react-hotkeys-hook";
import { FileUpload } from "@/components/ui/FileUpload";
import { AutocompleteInput } from "@/components/ui/AutocompleteInput";

const getBaseTripFormValues = (): Omit<TripDetailsFormData, 'tripStartDate' | 'tripEndDate'> & { tripStartDate?: Date, tripEndDate?: Date } => ({
    driverName: "",
    destinationType: DestinationType.INTERNAL,
    cityName: "",
    countryName: "",
    tripStartDate: undefined,
    tripEndDate: undefined,
});

interface TripDetailsFormProps {
  onDetailsSubmit: (details: TripDetailsFormData) => void;
  initialData?: TripDetailsFormData | null;
}

export interface TripDetailsFormRef {
  validateAndGetData: () => Promise<TripDetailsFormData | null>;
  resetForm: (data?: TripDetailsFormData | null) => void;
}

const TripDetailsForm = React.forwardRef<TripDetailsFormRef, TripDetailsFormProps>(
  ({ onDetailsSubmit, initialData, onCancelEdit }: TripDetailsFormProps & { onCancelEdit?: () => void }, ref) => {

    // Local state for attached files
    const [attachedFiles, setAttachedFiles] = React.useState<File[]>([]);

    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const DRAFT_KEY = "pettycash_trip_details_draft";
    const form = useForm<TripDetailsFormData>({
      resolver: zodResolver(tripDetailsSchema),
      mode: "onChange",
      reValidateMode: "onChange",
      defaultValues: initialData || getBaseTripFormValues(),
    });

    // Restore draft from localStorage if exists (only if no initialData)
    React.useEffect(() => {
      if (!initialData) {
        const draft = typeof window !== "undefined" ? localStorage.getItem(DRAFT_KEY) : null;
        if (draft) {
          try {
            const parsed = JSON.parse(draft);
            form.reset({
              ...getBaseTripFormValues(),
              ...parsed,
              tripStartDate: parsed.tripStartDate ? new Date(parsed.tripStartDate) : new Date(),
              tripEndDate: parsed.tripEndDate ? new Date(parsed.tripEndDate) : new Date(),
            });
          } catch {}
        } else {
          form.reset({
            ...getBaseTripFormValues(),
            tripStartDate: new Date(),
            tripEndDate: new Date(),
          });
        }
      } else {
        form.reset({
          ...initialData,
          tripStartDate: initialData.tripStartDate ? new Date(initialData.tripStartDate) : new Date(),
          tripEndDate: initialData.tripEndDate ? new Date(initialData.tripEndDate) : new Date(),
        });
      }
    }, [initialData, form.reset, form]);

    // Auto-save draft to localStorage on change
    React.useEffect(() => {
      const sub = form.watch((values) => {
        // Avoid saving empty form
        if (values.driverName || values.cityName || values.countryName) {
          const toSave: any = { ...values };
          // Convert dates to ISO for storage
          if (toSave.tripStartDate instanceof Date) toSave.tripStartDate = toSave.tripStartDate.toISOString();
          if (toSave.tripEndDate instanceof Date) toSave.tripEndDate = toSave.tripEndDate.toISOString();
          localStorage.setItem(DRAFT_KEY, JSON.stringify(toSave));
        }
      });
      return () => sub.unsubscribe();
    }, [form]);


    React.useImperativeHandle(ref, () => {
      return {
        validateAndGetData: async () => {
          const isValid = await form.trigger();
          if (isValid) {
            return form.getValues();
          }
          // Triggering validation will show errors on the form if any.
          // We can also show a general toast here, but ManageTripPage will show its own.
          return null;
        }
        ,
        resetForm: (data?: TripDetailsFormData | null) => {
          // Clear the component's own draft from local storage to prevent re-population
          localStorage.removeItem(DRAFT_KEY);

          // Reset the form with base values, including resetting dates to default
          const baseValues = getBaseTripFormValues();
          form.reset(data || {
            ...baseValues,
            tripStartDate: new Date(),
            tripEndDate: new Date(),
          });
        },
      };
    });

    const destinationType = form.watch("destinationType");

    async function onSubmit(values: TripDetailsFormData) {
      setIsSubmitting(true);
      // Clear draft on successful submit
      if (typeof window !== "undefined") {
        localStorage.removeItem(DRAFT_KEY);
      }
      onDetailsSubmit(values); 
      toast({
        title: "تم تحديث بيانات الرحلة مؤقتًا",
        description: `تم تحديث بيانات رحلة السائق ${values.driverName} محليًا. اضغط \"حفظ الرحلة بالكامل\" في الأسفل لحفظ كل شيء.`,
      });
      setIsSubmitting(false);
    }

    // Helper: scroll to first error on submit
    const scrollToFirstError = React.useCallback(() => {
      const errorKeys = Object.keys(form.formState.errors);
      if (errorKeys.length > 0) {
        const el = document.querySelector(`[name='${errorKeys[0]}']`);
        if (el && typeof (el as any).scrollIntoView === "function") {
          (el as any).scrollIntoView({ behavior: "smooth", block: "center" });
          (el as HTMLElement).focus();
        }
      }
    }, [form.formState.errors]);

    // Keyboard shortcuts
    useHotkeys(
      'enter',
      (e) => {
        // Only submit if focus is inside the form
        if (document.activeElement && (document.activeElement as any)?.form) {
          e.preventDefault();
          form.handleSubmit(onSubmit)();
        }
      },
      { enableOnFormTags: true },
      [form]
    );
    useHotkeys(
      'esc',
      (e) => {
        e.preventDefault();
        if (onCancelEdit) {
          onCancelEdit();
        } else {
          form.reset();
        }
      },
      { enableOnFormTags: true },
      [form, onCancelEdit]
    );

    // Live summary values
    const driverName = form.watch("driverName");
    const cityName = form.watch("cityName");
    const countryName = form.watch("countryName");
    const tripStartDate = form.watch("tripStartDate");
    const tripEndDate = form.watch("tripEndDate");

    function formatDate(date: Date | string | undefined) {
      if (!date) return "-";
      try {
        const d = typeof date === "string" ? new Date(date) : date;
        return d.toLocaleDateString("ar-EG");
      } catch { return "-"; }
    }

    return (
      <>
        {React.useMemo(() => (
          <Card className="mb-4 bg-blue-50 dark:bg-zinc-800 border-blue-200 dark:border-zinc-700 text-blue-900 dark:text-blue-100" aria-hidden="true" tabIndex={-1}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">ملخص الرحلة الحالي</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <div><span className="font-medium">السائق:</span> {driverName || <span className="text-gray-400">غير محدد</span>}</div>
              <div>
                <span className="font-medium">الوجهة:</span> {destinationType === DestinationType.INTERNAL ? (cityName || <span className="text-gray-400">مدينة غير محددة</span>) : (countryName || <span className="text-gray-400">بلد غير محدد</span>)}
              </div>
              <div>
                <span className="font-medium">تاريخ البدء:</span> {formatDate(tripStartDate)}
                <span className="mx-2">|</span>
                <span className="font-medium">تاريخ النهاية:</span> {formatDate(tripEndDate)}
              </div>
            </CardContent>
          </Card>
        ), [driverName, destinationType, cityName, countryName, tripStartDate, tripEndDate])}
      <Card className="shadow-lg no-print">
        <CardHeader>
          <CardTitle>بيانات الرحلة</CardTitle>
          <CardDescription>أدخل تفاصيل الرحلة هنا. يمكنك الضغط على "تحديث بيانات الرحلة" لتأكيدها مؤقتًا، أو حفظ الرحلة بأكملها مباشرة بالزر في الأسفل.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, scrollToFirstError)} className="space-y-6">
              <FormField
                control={form.control}
                name="driverName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
  اسم السائق
  {form.formState.errors.driverName && <FormErrorIcon />}
</FormLabel>
                       <FormControl>
                         <Input placeholder="ادخل اسم السائق" aria-label="اسم السائق" {...field} />
                       </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tripStartDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>
  تاريخ بدء الرحلة
  {form.formState.errors.tripStartDate && <FormErrorIcon />}
</FormLabel>
                      <FormControl>
                        <DatePicker date={field.value} setDate={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tripEndDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>
  تاريخ نهاية الرحلة
  {form.formState.errors.tripEndDate && <FormErrorIcon />}
</FormLabel>
                      <FormControl>
                        <DatePicker date={field.value} setDate={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="destinationType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>
  الوجهة
  {form.formState.errors.destinationType && <FormErrorIcon />}
</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (value === DestinationType.INTERNAL) {
                            form.setValue("countryName", ""); 
                            if (!form.getValues("cityName")) form.trigger("cityName");
                          } else {
                            form.setValue("cityName", ""); 
                            if (!form.getValues("countryName")) form.trigger("countryName");
                          }
                        }}
                        value={field.value}
                        className="flex flex-col space-y-1 md:flex-row md:space-y-0 md:space-x-4 md:space-x-reverse"
                      >
                        <FormItem className="flex items-center space-x-2 space-x-reverse">
                          <FormControl>
                            <RadioGroupItem value={DestinationType.INTERNAL} />
                          </FormControl>
                          <FormLabel className="font-normal">داخل البلاد</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-x-reverse">
                          <FormControl>
                            <RadioGroupItem value={DestinationType.EXTERNAL} />
                          </FormControl>
                          <FormLabel className="font-normal">خارج البلاد</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {destinationType === DestinationType.INTERNAL && (
                <FormField
                  control={form.control}
                  name="cityName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
  اسم المدينة
  {form.formState.errors.cityName && <FormErrorIcon />}
</FormLabel>
                      <FormControl>
                        <AutocompleteInput
                          placeholder="ادخل اسم المدينة"
                          aria-label="اسم المدينة"
                          suggestions={["القاهرة", "الإسكندرية", "أسوان", "الأقصر", "الغردقة", "شرم الشيخ", "المنصورة", "الفيوم", "سوهاج", "دمياط", "طنطا", "أسيوط", "الزقازيق", "دمنهور"]}
                          {...field}
                          value={field.value || ""}
                          onChange={e => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {destinationType === DestinationType.EXTERNAL && (
                <FormField
                  control={form.control}
                  name="countryName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
  اسم البلد
  {form.formState.errors.countryName && <FormErrorIcon />}
</FormLabel>
                      <FormControl>
                        <AutocompleteInput
                          placeholder="ادخل اسم البلد"
                          aria-label="اسم البلد"
                          suggestions={["مصر", "السعودية", "الإمارات", "الأردن", "الكويت", "قطر", "تركيا", "لبنان", "المغرب", "تونس", "الجزائر", "السودان", "اليمن", "عمان", "سوريا", "العراق"]}
                          {...field}
                          value={field.value || ""}
                          onChange={e => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <hr className="my-4 border-blue-200 dark:border-zinc-700" />
              <div>
                <label className="block mb-1 font-semibold text-blue-900 dark:text-blue-100">المرفقات</label>
                <FileUpload
                  label="إرفاق مستندات أو صور (اختياري)"
                  multiple
                  accept="image/*,application/pdf"
                  onFilesChange={(files) => setAttachedFiles(files)}
                  value={attachedFiles}
                  aria-label="إرفاق مستندات أو صور"
                />
                {isSubmitting && (
                  <div className="flex items-center gap-2 mt-2 text-blue-600 dark:text-blue-200 text-xs">
                    <Loader2 className="animate-spin w-4 h-4" /> جاري رفع الملفات...
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
                تحديث بيانات الرحلة (مؤقتًا)
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      </>
    );
  }
);

TripDetailsForm.displayName = "TripDetailsForm";
export default TripDetailsForm;
