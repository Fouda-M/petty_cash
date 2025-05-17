
"use client";

import * as React from "react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, ListChecks, User, MapPin, CalendarDays, Hash } from 'lucide-react';
import type { SavedTrip } from "@/types";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";

const ALL_SAVED_TRIPS_KEY = "allSavedTrips_v1";

export default function SavedTripsPage() {
  const [savedTrips, setSavedTrips] = React.useState<SavedTrip[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    setIsLoading(true);
    try {
      const storedTripsJson = localStorage.getItem(ALL_SAVED_TRIPS_KEY);
      if (storedTripsJson) {
        const parsedTrips = JSON.parse(storedTripsJson) as SavedTrip[];
        // Sort by creation date, newest first
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
            <Card key={trip.id} className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="text-primary text-lg truncate">{trip.name}</CardTitle>
                <CardDescription>
                  حُفظت في: {format(new Date(trip.createdAt), "PPpp", { locale: arSA })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
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
                {/* Future: Add a button to view/load this trip */}
                 <Button variant="outline" size="sm" className="w-full mt-3" disabled title="قريبًا: عرض تفاصيل هذه الرحلة">
                    عرض التفاصيل (قريبًا)
                 </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
