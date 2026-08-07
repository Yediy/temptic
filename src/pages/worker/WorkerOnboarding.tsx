import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowRight, Check, ChevronRight, CircleDashed, Clock, Loader2, PartyPopper, RotateCcw } from "lucide-react";
import {
  useMyWorkerRecord,
  useResumableSession,
  useOnboardingProgress,
  useEnsureSession,
  useSaveStepProgress,
  useSetCurrentStep,
} from "@/hooks/onboarding/use-onboarding-resume";
import type { OnboardingStepKey } from "@/lib/onboarding/types";

function relativeTime(iso?: string | null) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} d ago`;
}

export default function WorkerOnboarding() {
  const { data: worker, isLoading: workerLoading } = useMyWorkerRecord();
  const { data: session, isLoading: sessionLoading } = useResumableSession(worker?.id);
  const progress = useOnboardingProgress(session);
  const ensure = useEnsureSession();
  const saveStep = useSaveStepProgress(session);
  const setCurrent = useSetCurrentStep(session);

  const [activeStep, setActiveStep] = useState<OnboardingStepKey | null>(null);

  // Auto-create a session so progress can be saved from the phone.
  useEffect(() => {
    if (!workerLoading && !sessionLoading && worker && !session && !ensure.isPending && !ensure.isSuccess) {
      ensure.mutate({ worker_id: worker.id, agency_id: worker.agency_id });
    }
  }, [workerLoading, sessionLoading, worker, session, ensure]);

  const loading = workerLoading || sessionLoading;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Your worker profile isn’t linked yet. Contact your agency to get set up.
        </p>
      </div>
    );
  }

  const openStep = async (key: OnboardingStepKey) => {
    setActiveStep(key);
    try {
      await setCurrent.mutateAsync(key);
    } catch {
      toast.error("Couldn’t save your place. Check your connection.");
    }
  };

  const markStep = async (key: OnboardingStepKey, status: "completed" | "in_progress" | "not_started") => {
    try {
      await saveStep.mutateAsync({ step: key, status });
      toast.success(status === "completed" ? "Step saved" : "Progress saved");
      if (status === "completed") setActiveStep(null);
    } catch {
      toast.error("Couldn’t save progress. Try again.");
    }
  };

  const resumeStep = progress.nextStep;

  return (
    <div className="space-y-5 animate-fade-in pb-24">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Onboarding</h1>
        <p className="text-sm text-muted-foreground">Finish at your own pace — we save every step.</p>
      </div>

      {/* Continue where you left off */}
      <section className="rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {progress.isComplete ? "All done" : "Continue where you left off"}
            </p>
            <p className="mt-1 truncate text-lg font-semibold">
              {progress.isComplete ? "Onboarding complete" : resumeStep?.label ?? "Get started"}
            </p>
            {progress.lastActivityAt && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Last saved {relativeTime(progress.lastActivityAt)}
              </p>
            )}
          </div>
          {progress.isComplete ? (
            <PartyPopper className="h-6 w-6 shrink-0 text-primary" />
          ) : null}
        </div>

        <div className="mt-4 space-y-2">
          <Progress value={progress.progressPct} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {progress.completed} of {progress.total} steps complete · {progress.progressPct}%
          </p>
        </div>

        {!progress.isComplete && resumeStep && (
          <Button
            className="mt-4 h-12 w-full text-base"
            onClick={() => openStep(resumeStep.key as OnboardingStepKey)}
            disabled={setCurrent.isPending}
          >
            {setCurrent.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {progress.completed === 0 ? "Start onboarding" : "Resume"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </section>

      {/* Step list */}
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Your steps</h2>
        </div>
        <ul className="divide-y">
          {progress.steps.map((step) => {
            const isOpen = activeStep === step.key;
            const done = step.status === "completed";
            return (
              <li key={step.key}>
                <button
                  type="button"
                  onClick={() => (isOpen ? setActiveStep(null) : openStep(step.key as OnboardingStepKey))}
                  className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/40 active:bg-muted/60"
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                      done
                        ? "border-primary bg-primary text-primary-foreground"
                        : step.status === "in_progress"
                          ? "border-primary text-primary"
                          : "border-border text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : step.index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-sm font-medium", done && "text-muted-foreground line-through")}>
                      {step.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {done
                        ? `Completed ${relativeTime(step.updatedAt) ?? ""}`
                        : step.status === "in_progress"
                          ? "In progress"
                          : "Not started"}
                    </span>
                  </span>
                  {step.status === "in_progress" && !done && (
                    <Badge variant="secondary" className="hidden sm:inline-flex">
                      Current
                    </Badge>
                  )}
                  <ChevronRight
                    className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")}
                  />
                </button>

                {isOpen && (
                  <div className="space-y-3 border-t bg-muted/20 px-4 py-4">
                    <p className="text-sm text-muted-foreground">
                      Complete “{step.label}” with your agency, then mark it here so you can pick up where you left off
                      next time.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      {done ? (
                        <Button
                          variant="outline"
                          className="h-11 flex-1"
                          onClick={() => markStep(step.key as OnboardingStepKey, "in_progress")}
                          disabled={saveStep.isPending}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Reopen step
                        </Button>
                      ) : (
                        <>
                          <Button
                            className="h-11 flex-1"
                            onClick={() => markStep(step.key as OnboardingStepKey, "completed")}
                            disabled={saveStep.isPending}
                          >
                            {saveStep.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="mr-2 h-4 w-4" />
                            )}
                            Mark complete
                          </Button>
                          <Button
                            variant="outline"
                            className="h-11 flex-1"
                            onClick={() => markStep(step.key as OnboardingStepKey, "in_progress")}
                            disabled={saveStep.isPending}
                          >
                            <CircleDashed className="mr-2 h-4 w-4" />
                            Save &amp; finish later
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
