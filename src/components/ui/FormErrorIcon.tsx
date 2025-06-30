import { AlertCircle } from "lucide-react";
import React from "react";

export function FormErrorIcon() {
  return (
    <AlertCircle className="inline-block text-red-500 w-4 h-4 mr-1 align-middle" aria-hidden="true" />
  );
}
