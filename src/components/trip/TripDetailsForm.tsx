
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
}

const TripDetailsForm = React.forwardRef<TripDetailsFormRef, TripDetailsFormProps>(
  ({ onDetailsSubmit, initialData }, ref) => {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<TripDetailsFormData>({
      resolver: zodResolver(tripDetailsSchema),
      defaultValues: initialData || getBaseTripFormValues(),
    });

    React.useEffect(() => {
      if (initialData) {
        form.reset({
          ...initialData,
          tripStartDate: initialData.tripStartDate ? new Date(initialData.tripStartDate) : new Date(),
          tripEndDate: initialData.tripEndDate ? new Date(initialData.tripEndDate) : new Date(),
        });
      } else {
        form.reset({
          ...getBaseTripFormValues(),
          tripStartDate: new Date(),
          tripEndDate: new Date(),
        });
      }
    }, [initialData, form.reset, form]);

    React.useImperativeHandle(ref, () => ({
      validateAndGetData: async () => {
        const isValid = await form.trigger();
        if (isValid) {
          return form.getValues();
        }
        // Triggering validation will show errors on the form if any.
        // We can also show a general toast here, but ManageTripPage will show its own.
        return null;
      },
    }));

    const destinationType = form.watch("destinationType");

    async function onSubmit(values: TripDetailsFormData) {
      setIsSubmitting(true);
      onDetailsSubmit(values); 
      toast({
        title: "تم تحديث بيانات الرحلة مؤقتًا",
        description: `تم تحديث بيانات رحلة السائق ${values.driverName} محليًا. اضغط "حفظ الرحلة بالكامل" في الأسفل لحفظ كل شيء.`,
      });
      setIsSubmitting(false);
    }

    return (
      <Card className="shadow-lg no-print">
        <CardHeader>
          <CardTitle>بيانات الرحلة</CardTitle>
          <CardDescription>أدخل تفاصيل الرحلة هنا. يمكنك الضغط على "تحديث بيانات الرحلة" لتأكيدها مؤقتًا، أو حفظ الرحلة بأكملها مباشرة بالزر في الأسفل.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="driverName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم السائق</FormLabel>
                    <FormControl>
                      <Input placeholder="ادخل اسم السائق" {...field} />
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
                      <FormLabel>تاريخ بدء الرحلة</FormLabel>
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
                      <FormLabel>تاريخ نهاية الرحلة</FormLabel>
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
                    <FormLabel>الوجهة</FormLabel>
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
                      <FormLabel>اسم المدينة</FormLabel>
                      <FormControl>
                        <Input placeholder="ادخل اسم المدينة" {...field} />
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
                      <FormLabel>اسم البلد</FormLabel>
                      <FormControl>
                        <Input placeholder="ادخل اسم البلد" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
                تحديث بيانات الرحلة (مؤقتًا)
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }
);

TripDetailsForm.displayName = "TripDetailsForm";
export default TripDetailsForm;
