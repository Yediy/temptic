import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge, type TicketStatus } from "@/components/StatusBadge";
import { useSignTicket, useRejectTicket } from "@/hooks/use-ticket-actions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ClientTicketSign() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const signTicket = useSignTicket();
  const rejectTicket = useRejectTicket();

  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [signerInitials, setSignerInitials] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Signature pad
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["client-ticket", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*, ticket_days(*)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Mark as viewed via secure edge function
  useEffect(() => {
    if (ticket && ticket.status === "sent") {
      supabase.functions.invoke("mark-viewed", {
        body: { ticket_id: ticket.id },
      }).catch(() => {});
    }
  }, [ticket?.id, ticket?.status]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const endDraw = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!ticket) {
    return <div className="py-24 text-center text-muted-foreground">Ticket not found.</div>;
  }

  const canSign = ["sent", "viewed"].includes(ticket.status);

  const handleSign = async () => {
    if (!signerName.trim()) { toast.error("Enter your name"); return; }
    if (!signerInitials.trim()) { toast.error("Enter your initials"); return; }
    if (!hasSignature) { toast.error("Please sign on the pad"); return; }

    const signatureImage = canvasRef.current?.toDataURL("image/png") || "";

    try {
      await signTicket.mutateAsync({
        ticket_id: ticket.id,
        signer_name: signerName.trim(),
        signer_title: signerTitle.trim(),
        signer_initials: signerInitials.trim(),
        signer_email: signerEmail.trim() || undefined,
        signature_image: signatureImage,
        signature_date: new Date().toISOString(),
      });
      toast.success("Ticket signed successfully!");
      navigate("/client/pending");
    } catch (err: any) {
      toast.error(err.message || "Failed to sign ticket");
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error("Please provide a reason"); return; }
    try {
      await rejectTicket.mutateAsync({ ticket_id: ticket.id, rejection_reason: rejectReason.trim() });
      toast.success("Ticket rejected");
      navigate("/client/pending");
    } catch (err: any) {
      toast.error(err.message || "Failed to reject ticket");
    }
  };

  const rows = [
    ["Ticket #", ticket.ticket_number],
    ["Type", ticket.ticket_type?.toUpperCase()],
    ["Worker", ticket.worker_name_snapshot],
    ["Site", ticket.site_name_snapshot || ticket.site_address_snapshot || "—"],
    ["Date", ticket.work_date || (ticket.week_start_date ? `${ticket.week_start_date} – ${ticket.week_end_date}` : "—")],
    ["Start Time", ticket.start_time || "—"],
    ["Job Title", ticket.job_title || "—"],
    ["Equipment", ticket.equipment_required || "—"],
    ["Hours", `${ticket.total_hours ?? 0}h`],
    ["PPE", [
      ticket.hard_hat_required && "Hard Hat",
      ticket.boots_required && "Boots",
      ticket.glasses_required && "Glasses",
      ticket.gloves_required && "Gloves",
      ticket.vest_required && "Vest",
    ].filter(Boolean).join(", ") || "None"],
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight font-mono">{ticket.ticket_number}</h1>
            <StatusBadge status={ticket.status as TicketStatus} />
          </div>
          <p className="text-sm text-muted-foreground">Review and sign this ticket</p>
        </div>
      </div>

      {/* Ticket info */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">Ticket Details</h3>
        <div className="grid gap-2.5 text-sm">
          {rows.map(([label, val]) => (
            <div key={label as string} className="flex justify-between border-b border-border/50 pb-2 last:border-0">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium">{val as string}</span>
            </div>
          ))}
        </div>
        {ticket.notes && (
          <div className="mt-4 rounded-lg bg-muted/30 p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{ticket.notes}</p>
          </div>
        )}
      </div>

      {/* Weekly ticket days */}
      {ticket.ticket_type === "weekly" && (ticket as any).ticket_days?.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Weekly Hours</h3>
          <div className="grid gap-2 text-sm">
            {(ticket as any).ticket_days.map((day: any) => (
              <div key={day.id} className="flex justify-between border-b border-border/50 pb-2 last:border-0">
                <span className="text-muted-foreground">{day.day_name || day.day_date}</span>
                <span className="font-medium">
                  {day.start_time || "—"} – {day.end_time || "—"} · {day.total_hours}h
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sign or Reject */}
      {canSign && !rejectMode && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Approve & Sign</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="signer_name">Your Name *</Label>
              <Input id="signer_name" placeholder="John Smith" value={signerName} onChange={e => setSignerName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="signer_title">Title</Label>
              <Input id="signer_title" placeholder="Site Foreman" value={signerTitle} onChange={e => setSignerTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="signer_initials">Initials *</Label>
              <Input id="signer_initials" placeholder="JS" value={signerInitials} onChange={e => setSignerInitials(e.target.value)} className="mt-1" maxLength={5} />
            </div>
            <div>
              <Label htmlFor="signer_email">Email</Label>
              <Input id="signer_email" type="email" placeholder="john@company.com" value={signerEmail} onChange={e => setSignerEmail(e.target.value)} className="mt-1" />
            </div>
          </div>

          {/* Signature pad */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Signature *</Label>
              {hasSignature && (
                <Button variant="ghost" size="sm" onClick={clearSignature} className="text-xs h-6">
                  Clear
                </Button>
              )}
            </div>
            <canvas
              ref={canvasRef}
              width={500}
              height={150}
              className="w-full border rounded-lg bg-white cursor-crosshair touch-none"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSign} disabled={signTicket.isPending} className="flex-1">
              <CheckCircle2 className="mr-1 h-4 w-4" /> Sign & Approve
            </Button>
            <Button variant="outline" onClick={() => setRejectMode(true)} className="text-destructive border-destructive/30 hover:bg-destructive/5">
              <XCircle className="mr-1 h-4 w-4" /> Reject
            </Button>
          </div>
        </div>
      )}

      {canSign && rejectMode && (
        <div className="rounded-xl border border-destructive/30 bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-destructive">Reject Ticket</h3>
          <div>
            <Label htmlFor="reject_reason">Reason for rejection *</Label>
            <Textarea id="reject_reason" placeholder="Please explain why this ticket is being rejected…" value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="mt-1" rows={3} />
          </div>
          <div className="flex gap-3">
            <Button variant="destructive" onClick={handleReject} disabled={rejectTicket.isPending} className="flex-1">
              <XCircle className="mr-1 h-4 w-4" /> Confirm Rejection
            </Button>
            <Button variant="outline" onClick={() => setRejectMode(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {!canSign && (
        <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
          <p className="text-sm">This ticket has already been <strong>{ticket.status}</strong> and cannot be modified.</p>
        </div>
      )}
    </div>
  );
}
