import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/woic/AsyncState";
import { usePassport } from "@/hooks/passport/use-workforce-passport";
import {
  PORTFOLIO_KINDS,
  usePortfolioItems,
  usePortfolioSignedUrls,
  useUpsertPortfolioItem,
  useDeletePortfolioItem,
  useSetPortfolioVisibility,
  useReorderPortfolioItem,
  type PortfolioItem,
  type PortfolioKind,
  MAX_PORTFOLIO_FILE_BYTES,
} from "@/hooks/passport/use-passport-portfolio";
import {
  Eye, EyeOff, FileText, Image as ImageIcon, Video, Trophy, Users, Wrench,
  ArrowUp, ArrowDown, Pencil, Trash2, Plus, ExternalLink,
} from "lucide-react";

const KIND_ICON: Record<string, typeof FileText> = {
  photo: ImageIcon, project: Wrench, video: Video,
  document: FileText, reference: Users, achievement: Trophy,
};

type FormState = {
  id?: string;
  kind: PortfolioKind;
  title: string;
  description: string;
  external_url: string;
  is_public: boolean;
  file: File | null;
  media_url: string | null;
};

const emptyForm = (): FormState => ({
  kind: "photo", title: "", description: "", external_url: "",
  is_public: false, file: null, media_url: null,
});

function useIsOwner(workerId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["passport-owner-check", workerId, user?.id],
    enabled: !!workerId && !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("workers").select("id").eq("id", workerId!).eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
  });
}

export default function PassportPortfolioManager() {
  const { passportId } = useParams<{ passportId: string }>();
  const { data: passport, isLoading: loadingPassport } = usePassport(passportId);
  const { data: isOwner } = useIsOwner(passport?.worker_id);
  const items = usePortfolioItems(passportId);
  const upsert = useUpsertPortfolioItem(passportId);
  const remove = useDeletePortfolioItem(passportId);
  const setVisibility = useSetPortfolioVisibility(passportId);
  const reorder = useReorderPortfolioItem(passportId);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const all = items.data ?? [];
  const paths = useMemo(
    () => all.map((i) => i.media_url).filter((p): p is string => !!p && !p.startsWith("http")),
    [all],
  );
  const urls = usePortfolioSignedUrls(paths);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((i) =>
      (kindFilter === "all" || i.kind === kindFilter) &&
      (!q || i.title.toLowerCase().includes(q) || (i.description ?? "").toLowerCase().includes(q)),
    );
  }, [all, kindFilter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of all) c[i.kind] = (c[i.kind] ?? 0) + 1;
    return c;
  }, [all]);

  const publicCount = all.filter((i) => i.is_public).length;

  const openNew = () => { setForm(emptyForm()); setOpen(true); };
  const openEdit = (item: PortfolioItem) => {
    setForm({
      id: item.id,
      kind: (item.kind as PortfolioKind) ?? "photo",
      title: item.title,
      description: item.description ?? "",
      external_url: item.external_url ?? "",
      is_public: item.is_public,
      file: null,
      media_url: item.media_url,
    });
    setOpen(true);
  };

  const submit = () => {
    if (!passportId) return;
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (form.file && form.file.size > MAX_PORTFOLIO_FILE_BYTES) {
      toast({ title: "File too large", description: "Maximum size is 25MB.", variant: "destructive" });
      return;
    }
    upsert.mutate(
      {
        id: form.id,
        passport_id: passportId,
        kind: form.kind,
        title: form.title,
        description: form.description,
        external_url: form.external_url,
        is_public: form.is_public,
        file: form.file,
        media_url: form.media_url,
        order_index: form.id ? undefined : all.length,
      },
      {
        onSuccess: () => {
          toast({ title: form.id ? "Portfolio item updated" : "Portfolio item added" });
          setOpen(false);
          setForm(emptyForm());
        },
        onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
      },
    );
  };

  const move = (item: PortfolioItem, dir: -1 | 1) => {
    const ordered = [...all].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const idx = ordered.findIndex((i) => i.id === item.id);
    const swap = ordered[idx + dir];
    if (!swap) return;
    reorder.mutate([
      { id: item.id, order_index: swap.order_index ?? idx + dir },
      { id: swap.id, order_index: item.order_index ?? idx },
    ]);
  };

  if (loadingPassport) return <LoadingState />;

  const accept = PORTFOLIO_KINDS.find((k) => k.key === form.kind)?.accept ?? "*/*";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-sm">Portfolio Manager</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Showcase photos, projects, videos, documents, references and achievements.
              Private items stay visible only to you and anyone you grant passport access.
            </p>
          </div>
          {isOwner && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add item</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{form.id ? "Edit portfolio item" : "Add portfolio item"}</DialogTitle>
                  <DialogDescription>Upload a file or link to external work, then choose who can see it.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Type</Label>
                    <Select value={form.kind} onValueChange={(v) => setForm((f) => ({ ...f, kind: v as PortfolioKind }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PORTFOLIO_KINDS.map((k) => (
                          <SelectItem key={k.key} value={k.key}>{k.label} — {k.hint}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Title</Label>
                    <Input maxLength={200} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Concrete pour — Tower B" />
                  </div>
                  <div className="space-y-1">
                    <Label>Description</Label>
                    <Textarea maxLength={2000} rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What did you do, when, and what was the outcome?" />
                  </div>
                  <div className="space-y-1">
                    <Label>File {form.media_url && !form.file ? "(replace existing)" : ""}</Label>
                    <Input type="file" accept={accept} onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))} />
                    <p className="text-xs text-muted-foreground">Max 25MB. Files are stored privately and served through expiring links.</p>
                  </div>
                  <div className="space-y-1">
                    <Label>External link (optional)</Label>
                    <Input maxLength={500} value={form.external_url} onChange={(e) => setForm((f) => ({ ...f, external_url: e.target.value }))} placeholder="https://" />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <Label className="text-sm">Public visibility</Label>
                      <p className="text-xs text-muted-foreground">Public items appear on your shared passport profile.</p>
                    </div>
                    <Switch checked={form.is_public} onCheckedChange={(v) => setForm((f) => ({ ...f, is_public: v }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={submit} disabled={upsert.isPending}>
                    {upsert.isPending ? "Saving…" : form.id ? "Save changes" : "Add to portfolio"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary">{all.length} items</Badge>
            <Badge variant="secondary">{publicCount} public</Badge>
            <Badge variant="secondary">{all.length - publicCount} private</Badge>
            {PORTFOLIO_KINDS.map((k) => (
              <Badge key={k.key} variant="outline">{k.label}: {counts[k.key] ?? 0}</Badge>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input placeholder="Search portfolio…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
            <Select value={kindFilter} onValueChange={setKindFilter}>
              <SelectTrigger className="sm:max-w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {PORTFOLIO_KINDS.map((k) => <SelectItem key={k.key} value={k.key}>{k.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {items.isLoading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          {all.length === 0 ? "No portfolio items yet." : "No items match your filters."}
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const Icon = KIND_ICON[item.kind] ?? FileText;
            const signed = item.media_url ? urls.data?.[item.media_url] : undefined;
            const isImage = item.kind === "photo" || item.kind === "project" || item.kind === "achievement";
            return (
              <Card key={item.id} className="overflow-hidden">
                <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                  {signed && isImage ? (
                    <img src={signed} alt={item.title} loading="lazy" className="h-full w-full object-cover" />
                  ) : signed && item.kind === "video" ? (
                    <video src={signed} controls className="h-full w-full object-cover" />
                  ) : (
                    <Icon className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <CardContent className="space-y-2 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{item.title}</div>
                      <div className="text-xs text-muted-foreground capitalize">{item.kind}</div>
                    </div>
                    <Badge variant={item.is_public ? "default" : "secondary"} className="shrink-0">
                      {item.is_public ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                      {item.is_public ? "Public" : "Private"}
                    </Badge>
                  </div>
                  {item.description && <p className="text-xs text-muted-foreground line-clamp-3">{item.description}</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {signed && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={signed} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3 mr-1" /> Open file</a>
                      </Button>
                    )}
                    {item.external_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={item.external_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3 mr-1" /> Link</a>
                      </Button>
                    )}
                  </div>
                  {isOwner && (
                    <div className="flex items-center justify-between border-t pt-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.is_public}
                          onCheckedChange={(v) => setVisibility.mutate({ id: item.id, is_public: v })}
                          aria-label="Toggle public visibility"
                        />
                        <span className="text-xs text-muted-foreground">Visible publicly</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => move(item, -1)} aria-label="Move up"><ArrowUp className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => move(item, 1)} aria-label="Move down"><ArrowDown className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(item)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                        <Button
                          size="icon" variant="ghost" aria-label="Delete"
                          onClick={() => {
                            if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
                            remove.mutate(item, {
                              onSuccess: () => toast({ title: "Item deleted" }),
                              onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
