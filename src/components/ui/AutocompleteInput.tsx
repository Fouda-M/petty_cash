"use client";
import * as React from "react";
import { Input } from "@/components/ui/input";

interface AutocompleteInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  suggestions: string[];
  onSelectSuggestion?: (value: string) => void;
}

export const AutocompleteInput = React.forwardRef<HTMLInputElement, AutocompleteInputProps>(
  ({ suggestions, onSelectSuggestion, ...props }, ref) => {
    const [showList, setShowList] = React.useState(false);
    const [filtered, setFiltered] = React.useState<string[]>([]);
    const [active, setActive] = React.useState(-1);
    const [value, setValue] = React.useState(props.value?.toString() || "");
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
      setValue(props.value?.toString() || "");
    }, [props.value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setValue(val);
      if (val) {
        const filtered = suggestions.filter((s) => s.toLowerCase().includes(val.toLowerCase()));
        setFiltered(filtered);
        setShowList(filtered.length > 0);
      } else {
        setShowList(false);
        setFiltered([]);
      }
      props.onChange?.(e);
    };

    const handleSelect = (suggestion: string) => {
      setValue(suggestion);
      setShowList(false);
      setActive(-1);
      onSelectSuggestion?.(suggestion);
      props.onChange?.({
        target: { value: suggestion },
      } as React.ChangeEvent<HTMLInputElement>);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showList) return;
      if (e.key === "ArrowDown") {
        setActive((prev) => (prev < filtered.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        setActive((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "Enter" && active >= 0) {
        handleSelect(filtered[active]);
      } else if (e.key === "Escape") {
        setShowList(false);
      }
    };

    return (
      <div className="relative">
        <Input
          {...props}
          ref={(node) => {
            (inputRef as any).current = node;
            if (ref) {
              if (typeof ref === "function") ref(node);
              else (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
            }
          }}
          value={value}
          autoComplete="off"
          onChange={handleChange}
          onFocus={() => setShowList(filtered.length > 0)}
          onBlur={() => setTimeout(() => setShowList(false), 100)}
          onKeyDown={handleKeyDown}
        />
        {showList && filtered.length > 0 && (
          <ul className="absolute z-10 left-0 right-0 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded shadow mt-1 max-h-40 overflow-y-auto">
            {filtered.map((s, i) => (
              <li
                key={s}
                className={`px-3 py-1 cursor-pointer ${i === active ? "bg-blue-100 dark:bg-zinc-700" : ""}`}
                onMouseDown={() => handleSelect(s)}
                onMouseEnter={() => setActive(i)}
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
);

AutocompleteInput.displayName = "AutocompleteInput";
