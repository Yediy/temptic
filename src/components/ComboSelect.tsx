import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ComboSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowOther?: boolean;
  otherLabel?: string;
  id?: string;
}

/**
 * Single-select combobox with an optional "Other" free-text fallback.
 * Stores a plain string in the parent form state to remain drop-in
 * compatible with existing text-input schemas.
 */
export function ComboSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  allowOther = true,
  otherLabel = "Other (type custom)",
  id,
}: ComboSelectProps) {
  const [open, setOpen] = useState(false);
  // "Other" mode when a value is set but not present in the preset list.
  const isPreset = !value || options.includes(value);
  const [otherMode, setOtherMode] = useState<boolean>(!!value && !isPreset);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className={cn(!value && "text-muted-foreground")}>
              {value || placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Search…" />
            <CommandList>
              <CommandEmpty>No match.</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={() => {
                      onChange(opt);
                      setOtherMode(false);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === opt ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {opt}
                  </CommandItem>
                ))}
                {allowOther && (
                  <CommandItem
                    value="__other__"
                    onSelect={() => {
                      setOtherMode(true);
                      onChange("");
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        otherMode ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="italic text-muted-foreground">
                      {otherLabel}
                    </span>
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {otherMode && (
        <Input
          autoFocus
          placeholder="Type custom value…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
