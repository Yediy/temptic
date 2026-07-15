## Phase 3 — WOIC (Workforce Operational Intelligence Core)

Additive to Phase 1 (Foundation) and Phase 2 (TTOS). Nothing existing is rewritten. All new subsystems are namespaced `woic_*` and coexist with `ttos_*`, `agencies`, `workers`, `clients`, `job_orders`, `ai_runs`, etc. Every module reads/writes WOIC via a thin service layer so future operating profiles (Education, Healthcare, Manufacturing…) plug in without redesign.

### Scope framing (important)

The prompt describes a multi-year intelligence platform. I will ship a **real, minimal, extensible core** now and stub advanced flourishes behind clean interfaces. Every service below gets: a table (or view over existing tables), RLS + GRANTs, an API surface (edge function or hook), and one working UI in the WOIC Admin Center. Deep AI/ML (custom-trained models, vector reranking, distributed agents) is deferred; the tables and endpoints exist so those upgrades drop in without schema change.

### What ships this phase

**1. Identity Intelligence — `woic_identities` + views**
- `woic_identities` table: global identity per person (worker/recruiter/client/etc.), one row per human across all orgs.
- `woic_identity_memberships` table: identity_id → agency_id + kind (worker/client_user/recruiter/admin/instructor/student/contractor/vendor/robot) + status.
- `woic_identity_profile` jsonb columns: skills, certifications, licenses, education, communication_prefs, ai_profile, behavior_profile, reputation_score, activity_score, availability.
- Backfill: identities inferred from existing `workers`, `client_signers`, `agency_members`, `profiles`. Idempotent SQL.
- Read-only view `woic_identity_directory` scoped by RLS to caller's agency memberships.

**2. Knowledge Intelligence — `woic_knowledge_*`**
- `woic_knowledge_articles` (id, agency_id, category_id, title, body, tags, permissions, version, tsv), `woic_knowledge_categories`, `woic_knowledge_vectors` (halfvec 1536, pgvector index).
- Backend embed via Lovable AI Gateway (`openai/text-embedding-3-small`, 1536 dims) called from edge function `woic-knowledge-index`.
- Search endpoint `woic-knowledge-search`: hybrid keyword (tsv) + vector cosine.
- Version history via `woic_knowledge_versions`.

**3. Decision Intelligence — `woic_decisions` + `woic_decision_evidence`**
- Every match/approval/eligibility/compliance decision logged here with: type, subject_entity, confidence, reasoning, alternative_options jsonb, risk, impact, evidence array, approver_id, outcome, timestamp.
- Wraps existing `ai_runs` and `candidate_decisions` — those keep working; WOIC mirrors an enterprise-shape row.

**4. Recommendation Engine — `woic_recommendations`**
- Rows: kind (best_candidate/best_recruiter/best_training/…), subject entity, score, reasoning, why array, expires_at, status.
- Edge function `woic-recommend` fans requests to specialized generators (candidate = reuses `match-candidates`; training = simple SQL rule for now; scheduling = placeholder).

**5. Prediction Intelligence — `woic_prediction_models` + `woic_prediction_results`**
- Registry rows for models (name, version, feature_set, endpoint, active). Results table stores subject, model_id, prediction, confidence, features_snapshot, produced_at.
- Ship one working baseline predictor (`assignment_acceptance_likelihood`) using rule-based heuristics; leaves room for real ML.

**6. Compliance Intelligence — `woic_compliance_rules` + `woic_compliance_events`**
- Rules table: kind (I-9/W-4/W-9/OSHA/HIPAA/CDL/TWIC/license/cert/policy/training), agency-scoped or global, cadence (once/annual/biennial/custom), grace_days.
- Events table: identity_id, rule_id, status (compliant/expiring/expired/waived), evidence_url, next_action_at.
- Cron edge function `woic-compliance-scan` (hourly): produces upcoming expirations, emits TTOS events `credential.expiring` → existing automations fire notifications.

**7. Communication Intelligence — `woic_conversations`**
- Threads that unify email/in-app/SMS/push (transports: in_app + email now, SMS/push stubbed).
- Ties to existing `notifications`, `ttos_messages`, and Resend deliveries via `conversation_id` foreign key (nullable, backfilled lazily).
- `woic-conversation-summarize` edge function: summary + unanswered-detection using Lovable AI Gateway.

**8. Learning Engine — `woic_learning_history`**
- Append-only rows recording outcome vs prediction (placement made / rejected / interview outcome / payroll correction / compliance issue / schedule change). Feeds future model retraining.

**9. Context Engine — `woic_context_sessions`**
- Per-user rolling context: current_agency, current_worker, current_client, current_job, current_workflow, recent_activity[], updated_at.
- Hook `useWoicContext()` writes on route change; every AI call attaches the context.

**10. Organizational Memory — `woic_org_memory`**
- Agency-scoped facts (jsonb) grouped by kind (policy/pattern/preference/history). Editable via WOIC Admin.
- AI calls read this by default (RAG augment).

**11. Service Registry + API Registry — `woic_service_registry` + `woic_api_registry`**
- Seeded rows for every WOIC service (identity, knowledge, decision, recommendation, compliance, prediction, learning, communication, workflow-intelligence, context) with endpoint + version + status.
- Client helper `src/lib/woic/services.ts` reads registry to discover endpoints — future modules never hardcode URLs.

**12. Workflow Intelligence**
- Reuses existing `ttos_automations`. Adds `woic_workflow_intelligence` view enriching runs with decision + recommendation joins so admins see *why* a workflow ran.
- Ships 2 built-in workflow templates: `hiring_pipeline`, `credential_renewal`.

**13. Universal API Layer**
- Single edge function `woic-api` with a dispatch table routing `{service, action, payload}` to internal handlers. Sub-routes exist for each of the 10 services above. Uniform JSON contract using existing `_shared/auth.ts`.

### UI — WOIC Administration Center (route `/woic`)

- `Overview` — AI Health, active services, event volume, decision latency.
- `Identities`, `Knowledge`, `Decisions`, `Recommendations`, `Predictions`, `Learning`, `Compliance`, `Context Monitor`, `Organizational Memory`, `Service Registry`, `API Monitor`.
- All pages are additive under `src/pages/woic/*`, wired in `App.tsx`, one sidebar entry gated to `agency_admin` + `super_admin`.

### Explicitly deferred (documented, not built)

- **Trained ML models / custom embeddings** — using rule-based heuristics + Lovable AI Gateway only.
- **Voice / Video transports** — schema accepts channels, transports throw `not_implemented`.
- **Distributed agents / horizontal AI sharding** — single-process edge functions for now.
- **Cross-agency identity linking** — a global identity exists per person, but merging duplicates across orgs stays admin-only.
- **Compliance form autofill (I-9/W-4/W-9 PDF generation)** — rules + events + reminders ship; PDF generation added when a real form ingest need exists.

### RLS pattern (every new table)

```
agency_id filter using private.current_agency_ids()  -- existing helper
service_role: full access
authenticated: SELECT within agency; INSERT/UPDATE gated by role_permissions
UPDATE/DELETE denied on decisions, learning, evidence (append-only)
GRANTs to authenticated + service_role in same migration
```

Identity table has a special two-scope rule: readable by any agency that has a membership row for that identity.

### Sequencing (4 sub-phases inside this build)

1. **DB spine** — one additive migration for all `woic_*` tables, views, RLS, GRANTs. Seed service_registry + api_registry + baseline compliance_rules. Enable pgvector for knowledge_vectors.
2. **Edge services** — deploy `woic-api`, `woic-knowledge-index`, `woic-knowledge-search`, `woic-recommend`, `woic-compliance-scan`, `woic-conversation-summarize`. All reuse `_shared/auth.ts` + `_shared/sentry.ts`.
3. **UI surfaces** — WOIC Admin Center pages + `useWoicContext` hook + `src/lib/woic/services.ts` client.
4. **Wire + verify** — emit TTOS events from decisions/recommendations/compliance so timeline picks them up; typecheck; run existing integration tests; add one WOIC smoke test that creates a decision and asserts it surfaces in the Decisions dashboard.

### Non-goals for this phase

- No changes to ticket lifecycle, PDF pipeline, Stripe, Resend transport, DocRaptor, Sentry setup, existing RLS on tickets/workers/clients/jobs.
- No renaming existing tables. WOIC coexists with Phase 1 + TTOS.
- No new external API integrations. Uses Lovable AI Gateway only (already configured).

### Deliverable at the end

A functioning WOIC intelligence core: 20 additive tables, one universal API edge function, five specialized service edge functions, a WOIC Admin Center with 12 pages, service + API registries seeded, one working baseline predictor, hybrid knowledge search live, compliance scanner running on cron, decisions + recommendations flowing into TTOS events + Timeline, and clean typed clients so every future operating profile consumes WOIC without duplicate logic.

If you want a smaller first cut (e.g. skip Predictions + Learning until real data exists) or a larger one (e.g. add I-9/W-4 PDF generation now), say which levers to pull before I start.
