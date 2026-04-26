import { LegalLayout } from "./LegalLayout";
import { Mail, LifeBuoy, Building2 } from "lucide-react";

export default function Contact() {
  return (
    <LegalLayout title="Contact Support" updated="">
      <p className="text-sm text-muted-foreground">
        We're here to help. Pick the channel that fits your question.
      </p>

      <div className="not-prose mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <Mail className="mb-2 h-5 w-5 text-primary" />
          <h3 className="font-semibold">General Support</h3>
          <p className="mt-1 text-sm text-muted-foreground">[PLACEHOLDER]@temptic.com</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <LifeBuoy className="mb-2 h-5 w-5 text-primary" />
          <h3 className="font-semibold">Billing Questions</h3>
          <p className="mt-1 text-sm text-muted-foreground">[PLACEHOLDER]@temptic.com</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 sm:col-span-2">
          <Building2 className="mb-2 h-5 w-5 text-primary" />
          <h3 className="font-semibold">Mailing Address</h3>
          <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">
            [PLACEHOLDER COMPANY NAME]{"\n"}
            [STREET]{"\n"}
            [CITY, STATE ZIP]
          </p>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Response times are typically within 1 business day.
      </p>
    </LegalLayout>
  );
}
