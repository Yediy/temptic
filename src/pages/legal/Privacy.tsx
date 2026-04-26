import { LegalLayout } from "./LegalLayout";

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="Last updated: [PLACEHOLDER]">
      <p className="text-sm text-muted-foreground italic">
        [PLACEHOLDER] — This document is a template. Replace with a privacy policy reviewed by qualified legal counsel
        and aligned with applicable laws (GDPR, CCPA, etc.).
      </p>

      <h2>1. Information We Collect</h2>
      <p>
        We collect information you provide directly (account details, agency and client records, ticket data, signatures)
        and information collected automatically (IP address, user-agent, timestamps for audit purposes).
      </p>

      <h2>2. How We Use Information</h2>
      <ul>
        <li>To provide and maintain the Service.</li>
        <li>To send transactional emails (ticket notifications, password resets, invitations).</li>
        <li>To produce auditable PDF records of approved tickets.</li>
        <li>To detect and prevent abuse via rate limiting and audit logs.</li>
      </ul>

      <h2>3. Information Sharing</h2>
      <p>
        We do not sell personal information. We share data with service providers (hosting, email delivery, payments)
        strictly to operate the Service.
      </p>

      <h2>4. Data Retention</h2>
      <p>
        Signed tickets and audit logs are retained for the lifetime of the agency account. [PLACEHOLDER — retention details.]
      </p>

      <h2>5. Security</h2>
      <p>
        We use Row Level Security, immutable audit logs, encrypted transport (TLS), and isolated tenant storage to protect data.
      </p>

      <h2>6. Your Rights</h2>
      <p>
        Depending on your jurisdiction, you may have rights to access, correct, or delete your personal data. Contact us via
        the Contact page to exercise these rights.
      </p>

      <h2>7. Children's Privacy</h2>
      <p>The Service is not directed to children under 13.</p>

      <h2>8. Changes to This Policy</h2>
      <p>We may update this policy. Material changes will be communicated via email or in-app notice.</p>

      <h2>9. Contact</h2>
      <p>Visit our Contact page for privacy inquiries.</p>
    </LegalLayout>
  );
}
