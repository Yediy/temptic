import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

interface MultiComboSelectProps {
  options: string[];
  /** Comma-separated string of selected values (keeps schema compatibility). */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowOther?: boolean;
  id?: string;
}

function parse(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function serialize(items: string[]): string {
  // De-dupe while preserving order.
  return Array.from(new Set(items)).join(", ");
}

/**
 * Multi-select combobox with chips and an optional "Other" free-text row.
 * Serializes selections into a comma-separated string so it drops into
 * existing text-column form state without a schema change.
 */
export function MultiComboSelect({
  options,
  value,
  onChange,
  placeholder = "Select items…",
  allowOther = true,
  id,
}: MultiComboSelectProps) {
  const [open, setOpen] = useState(false);
  const [otherDraft, setOtherDraft] = useState("");

  const selected = useMemo(() => parse(value), [value]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (opt: string) => {
    if (selectedSet.has(opt)) {
      onChange(serialize(selected.filter((s) => s !== opt)));
    } else {
      onChange(serialize([...selected, opt]));
    }
  };

  const removeAt = (idx: number) => {
    onChange(serialize(selected.filter((_, i) => i !== idx)));
  };

  const addOther = () => {
    const trimmed = otherDraft.trim();
    if (!trimmed) return;
    if (!selectedSet.has(trimmed)) {
      onChange(serialize([...selected, trimmed]));
    }
    setOtherDraft("");
  };

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
            <span
              className={cn(
                "truncate",
                selected.length === 0 && "text-muted-foreground",
              )}
            >
              {selected.length === 0
                ? placeholder
                : `${selected.length} selected`}
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
                {options.map((opt) => {
                  const isChecked = selectedSet.has(opt);
                  return (
                    <CommandItem
                      key={opt}
                      value={opt}
                      onSelect={() => toggle(opt)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isChecked ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {opt}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
          {allowOther && (
            <div className="flex items-center gap-2 border-t p-2">
              <Input
                placeholder="Add other…"
                value={otherDraft}
                onChange={(e) => setOtherDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addOther();
                  }
                }}
                className="h-8"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={addOther}
                disabled={!otherDraft.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((item, idx) => (
            <Badge
              key={`${item}-${idx}`}
              variant="secondary"
              className="pl-2 pr-1 py-1 gap-1"
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="rounded-sm hover:bg-muted-foreground/20 p-0.5"
                aria-label={`Remove ${item}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
