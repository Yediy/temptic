import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const PORTFOLIO_BUCKET = "passport-portfolio";

export type PortfolioKind =
  | "photo"
  | "project"
  | "video"
  | "document"
  | "reference"
  | "achievement";

export const PORTFOLIO_KINDS: { key: PortfolioKind; label: string; hint: string; accept: string }[] = [
  { key: "photo", label: "Photo", hint: "Job site photos and work samples.", accept: "image/*" },
  { key: "project", label: "Project", hint: "A completed project with details.", accept: "image/*,application/pdf" },
  { key: "video", label: "Video", hint: "Short clips demonstrating your work.", accept: "video/*" },
  { key: "document", label: "Document", hint: "Spec sheets, drawings, write-ups.", accept: "application/pdf,image/*,.doc,.docx,.txt" },
  { key: "reference", label: "Reference", hint: "Letters or notes from supervisors.", accept: "application/pdf,image/*,.doc,.docx" },
  { key: "achievement", label: "Achievement", hint: "Awards, milestones and recognitions.", accept: "image/*,application/pdf" },
];

export type PortfolioItem = {
  id: string;
  passport_id: string;
  kind: string;
  title: string;
  description: string | null;
  media_url: string | null;
  external_url: string | null;
  is_public: boolean;
  order_index: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export const MAX_PORTFOLIO_FILE_BYTES = 25 * 1024 * 1024;

export function usePortfolioItems(passportId?: string) {
  return useQuery({
    queryKey: ["passport-portfolio", passportId],
    enabled: !!passportId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passport_portfolios")
        .select("*")
        .eq("passport_id", passportId!)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PortfolioItem[];
    },
  });
}

/** Signed URLs for stored media, keyed by storage path. */
export function usePortfolioSignedUrls(paths: string[]) {
  const key = [...paths].sort().join("|");
  return useQuery({
    queryKey: ["passport-portfolio-urls", key],
    enabled: paths.length > 0,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(PORTFOLIO_BUCKET)
        .createSignedUrls(paths, 60 * 60);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data ?? []) {
        if (row.path && row.signedUrl) map[row.path] = row.signedUrl;
      }
      return map;
    },
  });
}

export type UpsertPortfolioInput = {
  id?: string;
  passport_id: string;
  kind: PortfolioKind;
  title: string;
  description?: string | null;
  external_url?: string | null;
  is_public: boolean;
  order_index?: number | null;
  file?: File | null;
  /** Existing storage path to keep when no new file is provided. */
  media_url?: string | null;
};

async function uploadFile(passportId: string, file: File) {
  if (file.size > MAX_PORTFOLIO_FILE_BYTES) {
    throw new Error("File is larger than the 25MB limit.");
  }
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.slice(0, 10) : "bin";
  const safe = `${crypto.randomUUID()}.${ext.replace(/[^a-zA-Z0-9]/g, "")}`;
  const path = `${passportId}/${safe}`;
  const { error } = await supabase.storage
    .from(PORTFOLIO_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type || undefined });
  if (error) throw error;
  return path;
}

export function useUpsertPortfolioItem(passportId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertPortfolioInput) => {
      let mediaPath = input.media_url ?? null;
      if (input.file) mediaPath = await uploadFile(input.passport_id, input.file);

      const row = {
        passport_id: input.passport_id,
        kind: input.kind,
        title: input.title.trim().slice(0, 200),
        description: input.description?.trim().slice(0, 2000) || null,
        external_url: input.external_url?.trim().slice(0, 500) || null,
        media_url: mediaPath,
        is_public: input.is_public,
        order_index: input.order_index ?? 0,
        updated_at: new Date().toISOString(),
      };

      if (input.id) {
        const { error } = await supabase.from("passport_portfolios").update(row).eq("id", input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase.from("passport_portfolios").insert(row).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["passport-portfolio", passportId] });
      qc.invalidateQueries({ queryKey: ["passport-bundle", passportId] });
    },
  });
}

export function useSetPortfolioVisibility(passportId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_public }: { id: string; is_public: boolean }) => {
      const { error } = await supabase
        .from("passport_portfolios")
        .update({ is_public, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passport-portfolio", passportId] }),
  });
}

export function useDeletePortfolioItem(passportId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: PortfolioItem) => {
      if (item.media_url) {
        await supabase.storage.from(PORTFOLIO_BUCKET).remove([item.media_url]);
      }
      const { error } = await supabase.from("passport_portfolios").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["passport-portfolio", passportId] });
      qc.invalidateQueries({ queryKey: ["passport-bundle", passportId] });
    },
  });
}

export function useReorderPortfolioItem(passportId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; order_index: number }[]) => {
      for (const u of updates) {
        const { error } = await supabase
          .from("passport_portfolios")
          .update({ order_index: u.order_index })
          .eq("id", u.id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passport-portfolio", passportId] }),
  });
}
