import { useIsDemo, DEMO_BANNER_TEXT } from "@/lib/demo";
import { Sparkles } from "lucide-react";

export function DemoBanner() {
  const { isDemo } = useIsDemo();
  if (!isDemo) return null;
  return (
    <div className="flex items-center justify-center gap-2 border-b border-accent/30 bg-accent/10 px-4 py-2 text-xs font-medium text-accent-foreground">
      <Sparkles className="h-3.5 w-3.5 text-accent" />
      <span>{DEMO_BANNER_TEXT}</span>
    </div>
  );
}
