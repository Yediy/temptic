import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Server, Key, Plug, Rocket, Users, DollarSign, ClipboardCheck } from "lucide-react";

function Section({ icon: Icon, title, children }: { icon: typeof Briefcase; title: string; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <div className="space-y-2 text-sm text-muted-foreground">{children}</div>
    </Card>
  );
}

const envVars = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_PROJECT_ID",
  "SUPABASE_SERVICE_ROLE_KEY (server)",
  "LOVABLE_API_KEY (server)",
  "RESEND_API_KEY (email, optional)",
  "STRIPE_SECRET_KEY (billing, optional)",
];

const checklist = [
  "Transfer custom domains and DNS (root + notify subdomain)",
  "Rotate SUPABASE service-role and anon keys",
  "Transfer Stripe account ownership / rotate keys",
  "Transfer email-sending domain (Resend / SES) and DKIM/SPF DNS",
  "Transfer Git repository ownership and CI/CD secrets",
  "Transfer Supabase project ownership (Settings → Team)",
  "Hand over super_admin account credentials and create buyer admin",
  "Document any agency accounts that should be migrated or deleted",
];

export default function Handoff() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Briefcase className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Seller Handoff Pack</h1>
          <p className="text-sm text-muted-foreground">Internal reference for transferring or onboarding ownership of Temp Tic.</p>
        </div>
        <Badge variant="outline" className="ml-auto">Super Admin Only</Badge>
      </div>

      <Section icon={Briefcase} title="Product Summary">
        <p>
          <strong>Temp Tic</strong> ("Labor Tickets Made Digital") is a multi-tenant SaaS that replaces paper labor
          tickets with auditable digital records. It serves three roles via separate portals: <strong>Agencies</strong> create
          and dispatch tickets, <strong>Clients</strong> approve or reject them with on-screen signatures, and <strong>Workers</strong> view
          their own approved hours.
        </p>
        <p>Every signed ticket produces an immutable PDF record with audit metadata (IP, user-agent, timestamp).</p>
      </Section>

      <Section icon={Server} title="Tech Stack">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Frontend:</strong> React 18, Vite 5, Tailwind v3, TypeScript 5, shadcn/ui, TanStack Query, React Router</li>
          <li><strong>Backend:</strong> Supabase (Postgres + RLS, Auth, Storage, Edge Functions on Deno)</li>
          <li><strong>Auth:</strong> Supabase email/password with role tables (no auth.users FK; <code className="rounded bg-muted px-1">user_roles</code> + <code className="rounded bg-muted px-1">has_role()</code>)</li>
          <li><strong>PDF:</strong> Puppeteer Edge Function rendering HTML templates</li>
          <li><strong>Email:</strong> Resend via <code className="rounded bg-muted px-1">send-transactional-email</code> + branded auth-email-hook</li>
          <li><strong>Storage:</strong> <code className="rounded bg-muted px-1">ticket-assets</code> bucket, isolated per <code className="rounded bg-muted px-1">{`{agency_id}/{ticket_id}`}</code></li>
          <li><strong>Billing:</strong> Stripe checkout via <code className="rounded bg-muted px-1">create-checkout-session</code></li>
        </ul>
      </Section>

      <Section icon={Key} title="Environment Variables Checklist">
        <ul className="grid gap-2 sm:grid-cols-2">
          {envVars.map(v => (
            <li key={v} className="rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-xs">{v}</li>
          ))}
        </ul>
        <p className="text-xs">Auto-populated keys ship in <code className="rounded bg-muted px-1">.env</code>. Server secrets live in Supabase Edge Function secrets.</p>
      </Section>

      <Section icon={Plug} title="External Providers Needed">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Stripe:</strong> Subscription billing ($80/mo, $816/yr).</li>
          <li><strong>Email (Resend):</strong> Transactional + Auth emails. Requires a verified sending domain.</li>
          <li><strong>PDF:</strong> Puppeteer runs inside the Edge Function — no external service required.</li>
          <li><strong>Storage:</strong> Supabase Storage (no third-party CDN required).</li>
        </ul>
      </Section>

      <Section icon={Rocket} title="Deployment Steps">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Provision a fresh Supabase project; apply all migrations from <code className="rounded bg-muted px-1">supabase/migrations</code>.</li>
          <li>Set Edge Function secrets (Stripe, Resend, internal service secret).</li>
          <li>Deploy frontend (Vercel / Netlify / Lovable). Point custom domain.</li>
          <li>Configure Auth email hook to <code className="rounded bg-muted px-1">auth-email-hook</code> Edge Function.</li>
          <li>Verify sending domain DNS (DKIM, SPF, DMARC).</li>
          <li>Create a super_admin via SQL: insert into <code className="rounded bg-muted px-1">user_roles</code>.</li>
          <li>Smoke-test full ticket lifecycle on a test agency.</li>
        </ol>
      </Section>

      <Section icon={Users} title="User Roles">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>super_admin:</strong> Cross-tenant oversight, agency management, rate-limit dashboard.</li>
          <li><strong>agency_admin / dispatcher / payroll / viewer:</strong> Agency portal with progressive permissions.</li>
          <li><strong>client_user:</strong> Approves/rejects tickets in the Client Portal.</li>
          <li><strong>worker_user:</strong> Views own approved hours in the Worker Portal.</li>
        </ul>
      </Section>

      <Section icon={DollarSign} title="Revenue Model">
        <p>Single-tier <strong>"Temp Tic Agency"</strong> subscription:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>$80 / month</li>
          <li>$816 / year (15% annual discount)</li>
          <li>One agency, one price — no per-seat or per-ticket charges in v1.</li>
        </ul>
      </Section>

      <Section icon={ClipboardCheck} title="Transfer Checklist">
        <ul className="space-y-2">
          {checklist.map(item => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
