"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

interface LanguageSwitcherProps {
  currentLang: "ar" | "en";
  onToggle?: (lang: "ar" | "en") => void;
}

// Simple language switcher stub to satisfy linter. Not wired to i18n yet.
export default function LanguageSwitcher({ currentLang, onToggle }: LanguageSwitcherProps) {
  const handleToggle = (lang: "ar" | "en") => () => {
    if (lang !== currentLang && onToggle) onToggle(lang);
  };

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant={currentLang === "ar" ? "default" : "outline"}
        aria-pressed={currentLang === "ar"}
        onClick={handleToggle("ar")}
      >
        العربية
      </Button>
      <Button
        size="sm"
        variant={currentLang === "en" ? "default" : "outline"}
        aria-pressed={currentLang === "en"}
        onClick={handleToggle("en")}
      >
        English
      </Button>
    </div>
  );
}
