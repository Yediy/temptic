import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  CapabilityState, ConfidenceMeter, MetadataBlock, Panel, PrivacyNotice, SessionStateBadge,
  UtilizationMeter,
} from "@/components/memory/MemBits";
import { useMemoryCapability, useMemoryList, useMemorySettings } from "@/hooks/memory/use-memory";
import { asRecord, str } from "@/lib/memory/platform";

const SECTIONS: Array<[string, string]> = [
  ["objective", "Objective"],
  ["subgoals", "Subgoals"],
  ["entities", "Entities"],
  ["evidence", "Evidence"],
  ["claims", "Claims"],
  ["hypotheses", "Hypotheses"],
  ["contradictions", "Contradictions"],
  ["questions", "Questions"],
  ["constraints", "Constraints"],
  ["assumptions", "Assumptions"],
  ["intermediate_results", "Intermediate Results"],
  ["pending_work", "Pending Work"],
  ["risk", "Risk"],
  ["uncertainty", "Uncertainty"],
  ["budget", "Budget"],
  ["escalation_state", "Escalation State"],
];

export default function CognitiveStateView() {
  const [settings] = useMemorySettings();
  const [sessionId, setSessionId] = useState("");

  const sessions = useMemoryList("memory.sessions.list", {}, { refetchInterval: settings.refreshMs });
  const activeId = sessionId || str(asRecord(sessions.rows[0]).id ?? asRecord(sessions.rows[0]).session_id);

  const state = useMemoryCapability<Record<string, unknown>>(
    "memory.state.get",
    { session_id: activeId },
    { enabled: !!activeId, refetchInterval: settings.refreshMs },
  );
  const s = asRecord(state.data);

  return (
    <div className="space-y-4">
      <Panel title="Cognitive State" description="The structured state WOIC holds for a session. No hidden chain-of-thought is exposed.">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label htmlFor="session-id" className="text-xs text-muted-foreground">Session</label>
          <Input
            id="session-id"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder={activeId || "session id"}
            className="h-8 w-72 font-mono text-xs"
          />
          {activeId && <span className="text-[11px] text-muted-foreground">Showing {activeId}</span>}
        </div>

        {!activeId ? (
          <CapabilityState status={sessions.status} message={sessions.message} label="cognitive session state">
            <p className="text-sm text-muted-foreground">
              No session is currently reported. Enter a session identifier to inspect its state.
            </p>
          </CapabilityState>
        ) : (
          <CapabilityState status={state.status} message={state.message} label="cognitive session state">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <SessionStateBadge value={s.status ?? s.state} />
              <ConfidenceMeter value={s.confidence} />
              <UtilizationMeter value={s.memory_utilization} label="Memory" />
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {SECTIONS.map(([key, label]) => (
                <div key={key}>
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
                  <MetadataBlock value={s[key]} />
                </div>
              ))}
            </div>
          </CapabilityState>
        )}
      </Panel>

      <PrivacyNotice />
    </div>
  );
}
