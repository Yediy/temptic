// IWOS Universal Command Center — palette UI.
// Keyboard-first, fuzzy, instant. Pure presentation over useCommandCenter.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { useCommandCenter } from "@/hooks/command/use-command-center";
import type { CommandDef } from "@/lib/command/registry";
import { Star, Pin, Brain, Loader2, CornerDownLeft, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";

function CommandRow({
  cmd, onRun, onFav, onPin, isFav, isPin,
}: {
  cmd: CommandDef;
  onRun: (c: CommandDef) => void;
  onFav: (id: string) => void;
  onPin: (id: string) => void;
  isFav: boolean;
  isPin: boolean;
}) {
  const Icon = cmd.icon;
  return (
    <CommandItem value={`${cmd.id} ${cmd.label} ${(cmd.keywords ?? []).join(" ")}`} onSelect={() => onRun(cmd)}>
      <Icon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <span className="truncate">{cmd.label}</span>
        {cmd.hint && <p className="truncate text-xs text-muted-foreground">{cmd.hint}</p>}
      </div>
      <button
        type="button"
        aria-label={isFav ? "Remove favorite" : "Add favorite"}
        onClick={(e) => { e.stopPropagation(); onFav(cmd.id); }}
        className="ml-2 rounded p-1 hover:bg-muted"
      >
        <Star className={cn("h-3.5 w-3.5", isFav ? "fill-primary text-primary" : "text-muted-foreground")} />
      </button>
      <button
        type="button"
        aria-label={isPin ? "Unpin command" : "Pin command"}
        onClick={(e) => { e.stopPropagation(); onPin(cmd.id); }}
        className="rounded p-1 hover:bg-muted"
      >
        <Pin className={cn("h-3.5 w-3.5", isPin ? "fill-primary text-primary" : "text-muted-foreground")} />
      </button>
    </CommandItem>
  );
}

export function CommandCenter() {
  const cc = useCommandCenter();
  const {
    open, setOpen, query, setQuery, ranked, hits, searching,
    pinnedCommands, favoriteCommands, recentCommands,
    favorites, pinned, toggleFavorite, togglePinned,
    runCommand, openRecord, runNaturalLanguage,
    aiBusy, aiResult, aiError, isNaturalLanguage,
  } = cc;

  const groups = useMemo(() => {
    const map = new Map<string, CommandDef[]>();
    ranked.forEach((c) => {
      const list = map.get(c.group) ?? [];
      list.push(c);
      map.set(c.group, list);
    });
    return [...map.entries()];
  }, [ranked]);

  const showDefaults = query.trim().length === 0;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search, run a command, or ask WOIC…"
        value={query}
        onValueChange={setQuery}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && query.trim()) {
            e.preventDefault();
            void runNaturalLanguage(query.trim());
          }
        }}
      />
      <CommandList className="max-h-[70vh]">
        {isNaturalLanguage && (
          <CommandGroup heading="Ask WOIC">
            <CommandItem value="__woic_nl" onSelect={() => void runNaturalLanguage(query.trim())}>
              <Brain className="mr-2 h-4 w-4 text-primary" />
              <span className="truncate">Ask WOIC: “{query.trim()}”</span>
              <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                <CornerDownLeft className="h-3 w-3" /> ⌘↵
              </span>
            </CommandItem>
          </CommandGroup>
        )}

        {(aiBusy || aiResult || aiError) && (
          <div className="border-b px-4 py-3 text-sm">
            {aiBusy && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> WOIC is thinking…
              </p>
            )}
            {aiError && <p className="text-destructive">{aiError}</p>}
            {aiResult && !aiBusy && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  WOIC · {aiResult.operation}
                </p>
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs text-foreground">
                  {aiResult.output}
                </pre>
              </div>
            )}
          </div>
        )}

        <CommandEmpty>
          {searching ? "Searching…" : "No matches. Try a natural-language request."}
        </CommandEmpty>

        {showDefaults && pinnedCommands.length > 0 && (
          <CommandGroup heading="Pinned">
            {pinnedCommands.map((c) => (
              <CommandRow key={`p-${c.id}`} cmd={c} onRun={runCommand} onFav={toggleFavorite} onPin={togglePinned}
                isFav={favorites.includes(c.id)} isPin={pinned.includes(c.id)} />
            ))}
          </CommandGroup>
        )}
        {showDefaults && favoriteCommands.length > 0 && (
          <CommandGroup heading="Favorites">
            {favoriteCommands.map((c) => (
              <CommandRow key={`f-${c.id}`} cmd={c} onRun={runCommand} onFav={toggleFavorite} onPin={togglePinned}
                isFav isPin={pinned.includes(c.id)} />
            ))}
          </CommandGroup>
        )}
        {showDefaults && recentCommands.length > 0 && (
          <CommandGroup heading="Recent">
            {recentCommands.map((c) => (
              <CommandRow key={`r-${c.id}`} cmd={c} onRun={runCommand} onFav={toggleFavorite} onPin={togglePinned}
                isFav={favorites.includes(c.id)} isPin={pinned.includes(c.id)} />
            ))}
          </CommandGroup>
        )}

        {hits.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Records">
              {hits.map((h) => (
                <CommandItem
                  key={`${h.entity_type}:${h.entity_id}`}
                  value={`rec-${h.entity_id}-${h.title}`}
                  onSelect={() => openRecord(h)}
                >
                  <FileSearch className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{h.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {h.entity_type.replace(/_/g, " ")}{h.subtitle ? ` · ${h.subtitle}` : ""}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {groups.map(([group, items]) => (
          <CommandGroup key={group} heading={group}>
            {items.slice(0, showDefaults ? 8 : 12).map((c) => (
              <CommandRow key={c.id} cmd={c} onRun={runCommand} onFav={toggleFavorite} onPin={togglePinned}
                isFav={favorites.includes(c.id)} isPin={pinned.includes(c.id)} />
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

/** Trigger button — mirrors the palette shortcut for pointer users. */
export function CommandCenterTrigger({ className }: { className?: string }) {
  const [mac, setMac] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { setMac(/Mac|iPhone|iPad/.test(navigator.platform)); }, []);
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: !mac, metaKey: mac }))}
      className={cn(
        "inline-flex w-full items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/30 px-3 py-2 text-sm text-sidebar-muted transition-colors hover:bg-sidebar-accent/50",
        className,
      )}
    >
      <Brain className="h-4 w-4" />
      <span>Command Center</span>
      <kbd className="ml-auto text-[10px] tracking-wider">{mac ? "⌘K" : "Ctrl K"}</kbd>
    </button>
  );
}
