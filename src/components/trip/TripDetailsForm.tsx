
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


export default function TripDetailsForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<TripDetailsFormData>({
    resolver: zodResolver(tripDetailsSchema),
    defaultValues: getBaseTripFormValues(),
  });

  React.useEffect(() => {
    // Set dates to new Date() client-side after initial render
    // to avoid hydration mismatch.
    const currentValues = form.getValues();
    form.reset({
        ...getBaseTripFormValues(),
        driverName: currentValues.driverName, // Preserve existing values if any during reset
        destinationType: currentValues.destinationType,
        cityName: currentValues.cityName,
        countryName: currentValues.countryName,
        tripStartDate: currentValues.tripStartDate || new Date(),
        tripEndDate: currentValues.tripEndDate || new Date(),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.reset]); // form.getValues removed from deps to avoid potential infinite loops


  const destinationType = form.watch("destinationType");

  async function onSubmit(values: TripDetailsFormData) {
    setIsSubmitting(true);
    console.log("Trip Details Submitted: ", values);
    // In a real app, this would involve saving to a database.
    // For now, we simulate it.
    await new Promise(resolve => setTimeout(resolve, 500));
    toast({
      title: "تم حفظ بيانات الرحلة",
      description: `تم حفظ بيانات رحلة السائق ${values.driverName}.`,
    });
    setIsSubmitting(false);
    // form.reset({ // Optionally reset form after submission
    //     ...getBaseTripFormValues(),
    //     tripStartDate: new Date(),
    //     tripEndDate: new Date(),
    // });
  }

  return (
    <Card className="shadow-lg no-print">
      <CardHeader>
        <CardTitle>بيانات الرحلة</CardTitle>
        <CardDescription>أدخل تفاصيل الرحلة هنا.</CardDescription>
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
                          form.setValue("countryName", ""); // Clear country name if internal
                        } else {
                          form.setValue("cityName", ""); // Clear city name if external
                        }
                      }}
                      value={field.value}
                      className="flex flex-col space-y-1 md:flex-row md:space-y-0 md:space-x-4 md:space-x-reverse" // RTL space-x-reverse
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
              حفظ بيانات الرحلة
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
