
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
import { ArrowRight, ListChecks, User, MapPin, CalendarDays, Hash, Edit, Trash2, Wallet, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import type { SavedTrip, Transaction } from "@/types";
import { Currency, TransactionType } from "@/types";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { convertCurrency } from "@/lib/exchangeRates";
import { getCurrencyInfo } from "@/lib/constants";
import { cn } from "@/lib/utils";


const ALL_SAVED_TRIPS_KEY = "allSavedTrips_v1";
const EDITING_TRIP_ID_KEY = "editingTripId_v1"; 

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
        const parsedTrips = (JSON.parse(storedTripsJson) as SavedTrip[]).map(trip => ({
          ...trip,
          details: {
            ...trip.details,
            tripStartDate: new Date(trip.details.tripStartDate),
            tripEndDate: new Date(trip.details.tripEndDate),
          },
          transactions: (trip.transactions || []).map(t => ({
            ...t,
            date: new Date(t.date),
            amount: Number(t.amount) || 0, // Ensure amount is a number
          })),
          createdAt: trip.createdAt ? new Date(trip.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: trip.updatedAt ? new Date(trip.updatedAt).toISOString() : undefined,
        }));
        parsedTrips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSavedTrips(parsedTrips);
      } else {
        setSavedTrips([]);
      }
    } catch (error) {
      console.error("Failed to load saved trips from localStorage:", error);
      toast({variant: "destructive", title: "خطأ في تحميل الرحلات", description: "لم يتمكن من قراءة بيانات الرحلات المحفوظة."})
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

  const calculateTripProfitLossForDisplay = (trip: SavedTrip, targetDisplayCurrency: Currency = Currency.EGP) => {
    let totalRevenueAndClientCustody = 0;
    let totalExpenses = 0;
    let totalCustodyOwner = 0;
    let totalDriverFee = 0;

    trip.transactions.forEach(t => {
      const convertedAmount = convertCurrency(t.amount, t.currency, targetDisplayCurrency, trip.exchangeRates);
      if (t.type === TransactionType.REVENUE || t.type === TransactionType.CUSTODY_HANDOVER_CLIENT) {
        totalRevenueAndClientCustody += convertedAmount;
      } else if (t.type === TransactionType.EXPENSE) {
        totalExpenses += convertedAmount;
      } else if (t.type === TransactionType.CUSTODY_HANDOVER_OWNER) {
        totalCustodyOwner += convertedAmount;
      } else if (t.type === TransactionType.DRIVER_FEE) {
        totalDriverFee += convertedAmount;
      }
    });
    
    const finalNetProfit = (totalRevenueAndClientCustody + totalCustodyOwner) - totalExpenses - totalDriverFee - totalCustodyOwner;
    return finalNetProfit;
  };

  const formatCurrencyDisplay = (amount: number, currencyCode: Currency) => {
    const currencyInfo = getCurrencyInfo(currencyCode);
    const displayAmount = amount.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const amountClass = amount >= 0 ? "text-[hsl(var(--positive-balance-fg))]" : "text-[hsl(var(--negative-balance-fg))]";
    return (
      <span className={cn(amountClass, "font-semibold")}>
        {currencyInfo?.symbol || ''}{displayAmount}
      </span>
    );
  };


  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">الرحلات المحفوظة</h1>
          <Link href="/dashboard" passHref legacyBehavior>
            <Button variant="outline">
              <ArrowRight className="ms-2 h-4 w-4" />
              العودة إلى لوحة التحكم
            </Button>
          </Link>
        </div>
        <div className="text-center py-10 flex justify-center items-center">
          <Loader2 className="me-3 h-6 w-6 animate-spin text-primary"/>
          <p className="text-lg text-muted-foreground">جارٍ تحميل الرحلات المحفوظة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center">
          <ListChecks className="me-3 h-8 w-8 text-primary" />
          الرحلات المحفوظة
        </h1>
        <Link href="/dashboard" passHref legacyBehavior>
          <Button variant="outline">
             <ArrowRight className="ms-2 h-4 w-4" />
            العودة إلى لوحة التحكم
          </Button>
        </Link>
      </div>

      {savedTrips.length === 0 ? (
        <Card className="shadow-md">
          <CardContent className="p-8 text-center">
            <p className="text-xl text-muted-foreground">
              لا توجد رحلات محفوظة حتى الآن.
            </p>
             <Link href="/manage-trip" passHref legacyBehavior>
                <Button className="mt-4">
                    <PlusCircle className="ms-2 h-5 w-5" />
                    ابدأ بتسجيل رحلة جديدة
                </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedTrips.map((trip) => {
            const profitLoss = calculateTripProfitLossForDisplay(trip, Currency.EGP);
            const ProfitLossIcon = profitLoss >= 0 ? TrendingUp : TrendingDown;
            const profitLossColor = profitLoss >= 0 ? "text-[hsl(var(--positive-balance-fg))]" : "text-[hsl(var(--negative-balance-fg))]";

            return (
              <Card key={trip.id} className="shadow-lg hover:shadow-xl transition-shadow flex flex-col">
                <CardHeader>
                  <CardTitle className="text-primary text-lg truncate">{trip.name}</CardTitle>
                  <CardDescription>
                    حُفظت في: {format(new Date(trip.createdAt), "PPpp", { locale: arSA })}
                    {trip.updatedAt && <><br/>آخر تحديث: {format(new Date(trip.updatedAt), "PPpp", { locale: arSA })}</>}
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
                 <CardFooter className="pt-3 mt-auto border-t flex-col items-start space-y-2">
                    <div className="flex items-center w-full justify-between">
                        <span className="font-semibold text-sm flex items-center">
                            <Wallet className="ms-1 h-4 w-4 text-primary/90" />
                            صافي الربح/الخسارة:
                        </span>
                        <span className={cn("font-bold text-md flex items-center", profitLossColor)}>
                            <ProfitLossIcon className="ms-1 h-4 w-4" />
                            {formatCurrencyDisplay(profitLoss, Currency.EGP)}
                        </span>
                    </div>
                    <div className="flex gap-2 mt-3 w-full">
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
