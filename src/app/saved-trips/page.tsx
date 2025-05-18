
"use client";

import * as React from "react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowRight, ListChecks, User, MapPin, CalendarDays, Hash, Edit, Trash2, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import type { SavedTrip, Transaction } from "@/types";
import { TransactionType, Currency } from "@/types";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { convertCurrency, getExchangeRate } from "@/lib/exchangeRates"; // Import conversion utilities
import { getCurrencyInfo, CONVERSION_TARGET_CURRENCIES } from "@/lib/constants"; // Import currency info
import { cn } from "@/lib/utils";

const ALL_SAVED_TRIPS_KEY = "allSavedTrips_v1";
const EDITING_TRIP_ID_KEY = "editingTripId_v1";

interface TripProfitLossDetails {
  revenueAndClientCustody: number;
  expense: number;
  custodyOwner: number;
  driverFee: number;
}

const calculateTripProfitLossForDisplay = (trip: SavedTrip, targetCurrency: Currency): number => {
  let totalConvertedRevenueAndClientCustody = 0;
  let totalConvertedExpenses = 0;
  let totalConvertedCustodyOwner = 0;
  let totalConvertedDriverFee = 0;

  trip.transactions.forEach(t => {
    const type = t.type;
    // Ensure transaction amount is a number, default to 0 if not
    const amount = typeof t.amount === 'number' ? t.amount : 0;
    const convertedAmount = convertCurrency(amount, t.currency, targetCurrency, trip.exchangeRates);

    if (type === TransactionType.REVENUE || type === TransactionType.CUSTODY_HANDOVER_CLIENT) {
      totalConvertedRevenueAndClientCustody += convertedAmount;
    } else if (type === TransactionType.EXPENSE) {
      totalConvertedExpenses += convertedAmount;
    } else if (type === TransactionType.CUSTODY_HANDOVER_OWNER) {
      totalConvertedCustodyOwner += convertedAmount;
    } else if (type === TransactionType.DRIVER_FEE) {
      totalConvertedDriverFee += convertedAmount;
    }
  });

  const totalInitialIncomeAndCustody = totalConvertedRevenueAndClientCustody + totalConvertedCustodyOwner;
  const netProfitBeforeDriverFee = totalInitialIncomeAndCustody - totalConvertedExpenses;
  const profitBeforeOwnerCustodySettlement = netProfitBeforeDriverFee - totalConvertedDriverFee;
  const finalNetProfitAfterOwnerCustodySettlement = profitBeforeOwnerCustodySettlement - totalConvertedCustodyOwner;
  
  return finalNetProfitAfterOwnerCustodySettlement;
};

const formatCurrencyDisplay = (
  amount: number,
  currencyCode: Currency,
  coloration: 'default' | 'positive' | 'negative' | 'neutral' = 'default'
) => {
  const currencyInfo = getCurrencyInfo(currencyCode);
  const displayAmount = amount.toLocaleString('ar', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let amountClass = "";
  switch (coloration) {
    case 'positive':
      amountClass = "text-[hsl(var(--positive-balance-fg))]";
      break;
    case 'negative':
      amountClass = "text-[hsl(var(--negative-balance-fg))]";
      break;
    case 'neutral':
      amountClass = "text-foreground"; 
      break;
    case 'default':
    default:
      amountClass = amount >= 0 ? "text-[hsl(var(--positive-balance-fg))]" : "text-[hsl(var(--negative-balance-fg))]";
      break;
  }

  return (
    <span className={cn(amountClass, "whitespace-nowrap font-semibold")}>
      {currencyInfo?.symbol || ''}{displayAmount}
    </span>
  );
};


export default function SavedTripsPage() {
  const [savedTrips, setSavedTrips] = React.useState<SavedTrip[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [tripToDelete, setTripToDelete] = React.useState<SavedTrip | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  React.useEffect(() => {
    setIsLoading(true);
    try {
      const storedTripsJson = localStorage.getItem(ALL_SAVED_TRIPS_KEY);
      if (storedTripsJson) {
        const parsedTrips = JSON.parse(storedTripsJson) as SavedTrip[];
        // Ensure transactions have valid numeric amounts
        const validatedTrips = parsedTrips.map(trip => ({
          ...trip,
          transactions: trip.transactions.map(t => ({
            ...t,
            amount: Number(t.amount) || 0,
            date: new Date(t.date), // Ensure date is a Date object
             type: t.type as TransactionType, // Ensure type is correctly typed
          })),
           details: {
            ...trip.details,
            tripStartDate: new Date(trip.details.tripStartDate),
            tripEndDate: new Date(trip.details.tripEndDate),
          }
        }));
        validatedTrips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSavedTrips(validatedTrips);
      } else {
        setSavedTrips([]);
      }
    } catch (error) {
      console.error("Failed to load saved trips from localStorage:", error);
      toast({ variant: "destructive", title: "خطأ في تحميل الرحلات", description: "لم يتمكن من تحميل الرحلات المحفوظة." });
      setSavedTrips([]); 
    }
    setIsLoading(false);
  }, [toast]);

  const getDestinationDisplay = (trip: SavedTrip): string => {
    if (trip.details.destinationType === "INTERNAL" && trip.details.cityName) {
      return trip.details.cityName;
    }
    if (trip.details.destinationType === "EXTERNAL" && trip.details.countryName) {
      return trip.details.countryName;
    }
    return "غير محدد";
  };

  const handleDeleteRequest = (trip: SavedTrip) => {
    setTripToDelete(trip);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!tripToDelete) return;
    try {
      const updatedTrips = savedTrips.filter(t => t.id !== tripToDelete.id);
      localStorage.setItem(ALL_SAVED_TRIPS_KEY, JSON.stringify(updatedTrips));
      setSavedTrips(updatedTrips);
      toast({ title: "تم حذف الرحلة", description: `تم حذف رحلة "${tripToDelete.name}".` });
    } catch (error) {
      console.error("Error deleting trip:", error);
      toast({ variant: "destructive", title: "خطأ في الحذف", description: "لم يتم حذف الرحلة." });
    } finally {
      setIsDeleteDialogOpen(false);
      setTripToDelete(null);
    }
  };

  const handleEditRequest = (tripId: string) => {
    try {
      localStorage.setItem(EDITING_TRIP_ID_KEY, tripId);
      router.push('/manage-trip');
    } catch (error) {
      console.error("Error setting trip for editing:", error);
      toast({ variant: "destructive", title: "خطأ", description: "لم يتمكن من تجهيز الرحلة للتعديل." });
    }
  };
  

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">الرحلات المحفوظة</h1>
          <Link href="/manage-trip" passHref legacyBehavior>
            <Button variant="outline">
              <ArrowRight className="ms-2 h-4 w-4" />
              العودة إلى إدارة رحلة / بدء رحلة جديدة
            </Button>
          </Link>
        </div>
        <div className="text-center py-10">
          <p className="text-lg text-muted-foreground">جارٍ تحميل الرحلات المحفوظة...</p>
        </div>
      </div>
    );
  }

  const displayCurrency = Currency.EGP; // Choose a default currency for display

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center">
          <ListChecks className="me-3 h-8 w-8 text-primary" />
          الرحلات المحفوظة
        </h1>
        <Link href="/manage-trip" passHref legacyBehavior>
          <Button variant="outline">
             <ArrowRight className="ms-2 h-4 w-4" />
            العودة إلى إدارة رحلة / بدء رحلة جديدة
          </Button>
        </Link>
      </div>

      {savedTrips.length === 0 ? (
        <Card className="shadow-md">
          <CardContent className="p-8 text-center">
            <p className="text-xl text-muted-foreground">
              لا توجد رحلات محفوظة حتى الآن.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedTrips.map((trip) => {
            const finalProfitLoss = calculateTripProfitLossForDisplay(trip, displayCurrency);
            const isProfit = finalProfitLoss >= 0;
            const ProfitLossIcon = isProfit ? TrendingUp : TrendingDown;

            return (
              <Card key={trip.id} className="shadow-lg hover:shadow-xl transition-shadow flex flex-col">
                <CardHeader>
                  <CardTitle className="text-primary text-lg truncate">{trip.name}</CardTitle>
                  <CardDescription>
                    حُفظت في: {format(new Date(trip.createdAt), "PPpp", { locale: arSA })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm flex-grow">
                  <div className="flex items-center text-muted-foreground">
                    <User className="ms-2 h-4 w-4 text-primary/80" />
                    <span>السائق: {trip.details.driverName}</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="ms-2 h-4 w-4 text-primary/80" />
                    <span>الوجهة: {getDestinationDisplay(trip)}</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                     <CalendarDays className="ms-2 h-4 w-4 text-primary/80" />
                     <span>
                       من: {format(new Date(trip.details.tripStartDate), "P", { locale: arSA })} إلى: {format(new Date(trip.details.tripEndDate), "P", { locale: arSA })}
                     </span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Hash className="ms-2 h-4 w-4 text-primary/80" />
                    <span>عدد المعاملات: {trip.transactions.length}</span>
                  </div>
                </CardContent>
                <CardFooter className="flex-col items-start pt-2 pb-4 px-4 space-y-2">
                   <div className="flex items-center justify-between w-full pt-2 border-t">
                     <span className="font-semibold flex items-center">
                       <ProfitLossIcon className={`ms-1 h-5 w-5 ${isProfit ? 'text-[hsl(var(--positive-balance-fg))]' : 'text-[hsl(var(--negative-balance-fg))]'}`} />
                       صافي الربح/الخسارة:
                     </span>
                     {formatCurrencyDisplay(finalProfitLoss, displayCurrency, isProfit ? 'positive' : 'negative')}
                   </div>
                  <div className="flex gap-2 w-full mt-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1" 
                      onClick={() => handleEditRequest(trip.id)}
                    >
                      <Edit className="ms-1 h-3.5 w-3.5" />
                      تعديل
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="flex-1" 
                      onClick={() => handleDeleteRequest(trip)}
                    >
                      <Trash2 className="ms-1 h-3.5 w-3.5" />
                      مسح الرحلة
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من رغبتك في حذف هذه الرحلة؟</AlertDialogTitle>
            <AlertDialogDescription>
              لا يمكن التراجع عن هذا الإجراء. سيتم حذف بيانات الرحلة بشكل دائم.
              <br/>
              الرحلة: <strong>{tripToDelete?.name}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTripToDelete(null)}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>تأكيد الحذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

    