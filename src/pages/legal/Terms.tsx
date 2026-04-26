import { LegalLayout } from "./LegalLayout";

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service" updated="Last updated: [PLACEHOLDER]">
      <p className="text-sm text-muted-foreground italic">
        [PLACEHOLDER] — This document is a template. Replace with terms reviewed by qualified legal counsel before launch.
      </p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing or using Temp Tic ("the Service"), you agree to be bound by these Terms of Service. If you do not agree,
        do not use the Service.
      </p>

      <h2>2. Description of Service</h2>
      <p>
        Temp Tic provides a digital labor-ticket and approval platform that allows staffing agencies to create, dispatch,
        and archive labor tickets, and allows their clients and workers to review and sign those tickets electronically.
      </p>

      <h2>3. Accounts</h2>
      <p>
        You are responsible for maintaining the confidentiality of your account credentials and for all activities that
        occur under your account. Notify us immediately of any unauthorized use.
      </p>

      <h2>4. Subscription and Billing</h2>
      <p>
        Paid plans renew automatically until cancelled. [PLACEHOLDER — describe refund policy, proration, and trial terms.]
      </p>

      <h2>5. Acceptable Use</h2>
      <p>
        You agree not to misuse the Service, including by attempting to gain unauthorized access, transmitting malware,
        or using the Service for unlawful purposes.
      </p>

      <h2>6. Data and Privacy</h2>
      <p>
        Use of the Service is also governed by our Privacy Policy.
      </p>

      <h2>7. Disclaimers</h2>
      <p>
        The Service is provided "as is" without warranties of any kind. [PLACEHOLDER — full disclaimer text.]
      </p>

      <h2>8. Limitation of Liability</h2>
      <p>
        [PLACEHOLDER — limitation of liability text reviewed by counsel.]
      </p>

      <h2>9. Changes to Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will be communicated via email or in-app notice.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about these Terms? Visit our Contact page.
      </p>
    </LegalLayout>
  );
}
