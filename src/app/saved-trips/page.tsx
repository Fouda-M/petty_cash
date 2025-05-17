
"use client";

import * as React from "react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { ArrowRight, ListChecks, User, MapPin, CalendarDays, Hash, Edit, Trash2 } from 'lucide-react';
import type { SavedTrip } from "@/types";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

const ALL_SAVED_TRIPS_KEY = "allSavedTrips_v1";

export default function SavedTripsPage() {
  const [savedTrips, setSavedTrips] = React.useState<SavedTrip[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [tripToDelete, setTripToDelete] = React.useState<SavedTrip | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    setIsLoading(true);
    try {
      const storedTripsJson = localStorage.getItem(ALL_SAVED_TRIPS_KEY);
      if (storedTripsJson) {
        const parsedTrips = JSON.parse(storedTripsJson) as SavedTrip[];
        parsedTrips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSavedTrips(parsedTrips);
      } else {
        setSavedTrips([]);
      }
    } catch (error) {
      console.error("Failed to load saved trips from localStorage:", error);
      setSavedTrips([]); 
    }
    setIsLoading(false);
  }, []);

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
    // For now, this is a placeholder.
    // In the future, this would likely set an ID in localStorage and navigate to /manage-trip
    // which would then load this trip's data.
    toast({ title: "قيد التطوير", description: "سيتم تفعيل خاصية تعديل الرحلة قريبًا." });
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
          {savedTrips.map((trip) => (
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
              <div className="p-4 pt-0 mt-auto"> {/* Actions area */}
                <div className="flex gap-2 mt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1" 
                    onClick={() => handleEditRequest(trip.id)}
                    disabled // Disabled for now
                  >
                    <Edit className="ms-1 h-3.5 w-3.5" />
                    تعديل (قريبًا)
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
              </div>
            </Card>
          ))}
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
