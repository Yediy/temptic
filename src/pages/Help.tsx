import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { LifeBuoy, FileText, PenLine, HardHat, CreditCard, Mail } from "lucide-react";
import { Link } from "react-router-dom";

const sections = [
  {
    id: "agency-create",
    icon: FileText,
    title: "How agencies create tickets",
    body: (
      <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>From the sidebar, click <strong>Create Ticket</strong> (daily) or <strong>Weekly Ticket</strong>.</li>
        <li>Choose the <strong>Client</strong> and <strong>Site</strong>. Snapshots of address and contact are saved on the ticket.</li>
        <li>Pick a <strong>Worker</strong>. Only one worker per ticket is supported.</li>
        <li>Set hours, lunch, PPE requirements, and any future-order details.</li>
        <li>Review and save as <strong>Draft</strong>, then <strong>Send</strong> for client signature.</li>
      </ol>
    ),
  },
  {
    id: "client-sign",
    icon: PenLine,
    title: "How clients sign tickets",
    body: (
      <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>Clients receive an email with a secure link to the ticket.</li>
        <li>After accepting their invite, they sign in to the <strong>Client Portal</strong>.</li>
        <li>They review the ticket, then either <strong>Approve</strong> with an on-screen signature or <strong>Reject</strong> with a reason.</li>
        <li>Signed tickets are immutable. Rejected tickets can be corrected and re-sent by the agency.</li>
      </ol>
    ),
  },
  {
    id: "worker-view",
    icon: HardHat,
    title: "How workers view their records",
    body: (
      <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>Workers sign in at the <strong>Worker Portal</strong> using credentials provided by their agency.</li>
        <li>They see a redacted ticket view limited to hours, dates, and approval status.</li>
        <li>Workers can download their copy of signed tickets for personal records.</li>
      </ol>
    ),
  },
  {
    id: "billing",
    icon: CreditCard,
    title: "Billing help",
    body: (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>Temp Tic is one flat price per agency: <strong>$80/month</strong> or <strong>$816/year</strong> (15% off annual).</p>
        <p>Manage your subscription from the <Link to="/billing" className="text-primary underline">Billing</Link> page. To cancel, reach out via the Contact page.</p>
      </div>
    ),
  },
  {
    id: "invites",
    icon: Mail,
    title: "Invite help",
    body: (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>Client invites are sent from a client's signer record. The recipient receives an email with a secure onboarding link valid for 7 days.</p>
        <p>If a link expires, generate a new invite from <Link to="/invites" className="text-primary underline">Pending Invites</Link>. Tokens are single-use and stored as hashes — copy links cannot be retrieved after sending.</p>
      </div>
    ),
  },
];

export default function Help() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <LifeBuoy className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Help Center</h1>
          <p className="text-sm text-muted-foreground">Quick answers for everyday Temp Tic tasks.</p>
        </div>
      </div>

      <Card className="p-6">
        <Accordion type="single" collapsible className="w-full">
          {sections.map(({ id, icon: Icon, title, body }) => (
            <AccordionItem key={id} value={id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2">{body}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>

      <Card className="p-6">
        <h2 className="text-base font-semibold">Still stuck?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Reach out via the <Link to="/contact" className="text-primary underline">Contact</Link> page and we'll get back to you.
        </p>
      </Card>
    </div>
  );
}
