"use client";

import { useState, useEffect } from 'react';

export default function CurrentYear() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  if (year === null) {
    // Return a placeholder or null during server render / pre-hydration.
    // For a static year, it might be acceptable to show nothing briefly.
    // Using current year as a fallback during CSR loading phase, or you can use a spinner/dots.
    return <>{new Date().getFullYear()}</>; 
  }

  return <>{year}</>;
}
