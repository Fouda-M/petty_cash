
"use client";

import *a_s React from "react";
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
import { ArrowRight, ListChecks, User, MapPin, CalendarDays, Hash, Edit, Trash2, Wallet, TrendingUp, TrendingDown, Loader2, PlusCircle } from 'lucide-react';
import type { SavedTrip } from "@/types"; // Transaction type not directly needed here unless for detailed display later
import { Currency, TransactionType } from "@/types";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { convertCurrency } from "@/lib/exchangeRates";
import { getCurrencyInfo } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { supabase } from '@/lib/supabase/client';
import type { User as SupabaseUser } from "@supabase/supabase-js";


export default function SavedTripsPage() {
  const [currentUser, setCurrentUser] = React.useState<SupabaseUser | null>(null);
  const [savedTrips, setSavedTrips] = React.useState<SavedTrip[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [tripToDelete, setTripToDelete] = React.useState<SavedTrip | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  React.useEffect(() => {
    const fetchUserAndTrips = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({ title: "غير مصرح به", description: "يرجى تسجيل الدخول لعرض الرحلات المحفوظة.", variant: "destructive" });
        router.push('/');
        setIsLoading(false);
        return;
      }
      setCurrentUser(session.user);

      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (tripsError) {
        console.error("Failed to load saved trips from Supabase:", tripsError);
        toast({ variant: "destructive", title: "خطأ في تحميل الرحلات", description: tripsError.message });
        setSavedTrips([]);
      } else if (tripsData) {
        const parsedTrips = (tripsData as any[]).map(trip => ({
          ...trip,
          // Ensure nested JSONB fields are parsed if Supabase doesn't do it automatically, though it usually does for client libs
          details: typeof trip.details === 'string' ? JSON.parse(trip.details) : trip.details,
          transactions: typeof trip.transactions === 'string' ? JSON.parse(trip.transactions) : trip.transactions,
          exchangeRates: typeof trip.exchange_rates === 'string' ? JSON.parse(trip.exchange_rates) : trip.exchange_rates,
        })).map(trip => ({ // Second map for date parsing after ensuring objects
          ...trip,
          details: {
            ...trip.details,
            tripStartDate: new Date(trip.details.tripStartDate),
            tripEndDate: new Date(trip.details.tripEndDate),
          },
          transactions: (trip.transactions || []).map((t: any) => ({
            ...t,
            date: new Date(t.date),
            amount: Number(t.amount) || 0,
          })),
          createdAt: trip.created_at ? new Date(trip.created_at).toISOString() : new Date().toISOString(),
          updatedAt: trip.updated_at ? new Date(trip.updated_at).toISOString() : undefined,
        }));
        setSavedTrips(parsedTrips);
      } else {
        setSavedTrips([]);
      }
      setIsLoading(false);
    };
    fetchUserAndTrips();
  }, [router, toast]);

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

  const confirmDelete = async () => {
    if (!tripToDelete || !currentUser) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripToDelete.id)
        .eq('user_id', currentUser.id);

      if (error) throw error;

      setSavedTrips(prev => prev.filter(t => t.id !== tripToDelete.id));
      toast({ title: "تم حذف الرحلة", description: `تم حذف رحلة "${tripToDelete.name}".` });
    } catch (error: any) {
      console.error("Error deleting trip from Supabase:", error);
      toast({ variant: "destructive", title: "خطأ في الحذف", description: error.message || "لم يتم حذف الرحلة." });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setTripToDelete(null);
    }
  };

  const handleEditRequest = (tripId: string) => {
    router.push(`/manage-trip?edit=${tripId}`);
  };

  const calculateTripProfitLossForDisplay = (trip: SavedTrip, targetDisplayCurrency: Currency = Currency.EGP) => {
    let totalRevenueAndClientCustody = 0;
    let totalExpenses = 0;
    let totalCustodyOwner = 0;
    let totalDriverFee = 0;

    if (!trip.transactions || !Array.isArray(trip.transactions)) {
        console.warn(`Trip with ID ${trip.id} has no transactions array or it's invalid.`);
        return 0; // Or handle as an error
    }
    if (!trip.exchangeRates) {
        console.warn(`Trip with ID ${trip.id} has no exchangeRates object.`);
        return 0; // Or handle as an error
    }


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
                    <span>عدد المعاملات: {trip.transactions?.length || 0}</span>
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
                        disabled={isDeleting && tripToDelete?.id === trip.id}
                    >
                        {isDeleting && tripToDelete?.id === trip.id ? (
                            <Loader2 className="ms-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Trash2 className="ms-1 h-3.5 w-3.5" />
                        )}
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
            <AlertDialogCancel onClick={() => setTripToDelete(null)} disabled={isDeleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : "تأكيد الحذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
