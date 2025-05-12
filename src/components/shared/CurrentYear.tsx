
"use client";

import { useState, useEffect } from 'react';

export default function CurrentYear() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  if (year === null) {
    // Return null or a non-dynamic placeholder until client-side effect runs and sets the year.
    // This ensures server-rendered output (or initial client render before effect) is consistent.
    return null;
  }

  return <>{year}</>;
}

