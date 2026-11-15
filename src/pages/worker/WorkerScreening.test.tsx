import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: "worker-user" } }) }));
import { WorkerScreeningDocument } from "./WorkerScreening";

const record = { id: "consent-1", document_version: 2, consent_text: "Actual authorization from the agency.", consent_type: "background", signed_at: null };
function open() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/worker/screening/consent/consent-1"]}>
    <Routes><Route path="/worker/screening/consent/:id" element={<WorkerScreeningDocument kind="consent" />} /></Routes>
  </MemoryRouter></QueryClientProvider>);
}
describe("worker consent actions", () => {
  beforeEach(() => { mocks.rpc.mockReset(); });
  it("reads through the audited API and signs the exact reviewed version", async () => {
    let signed = false;
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === "sign_screening_consent_version") { signed = true; return { data: "2026-11-15T16:38:00Z", error: null }; }
      return { data: [{ ...record, signed_at: signed ? "2026-11-15T16:38:00Z" : null }], error: null };
    });
    open();
    await screen.findByText(record.consent_text);
    expect(mocks.rpc).toHaveBeenCalledWith("read_worker_screening", { _record_type: "consent", _record_id: "consent-1" });
    expect(screen.getByRole("button", { name: "Sign consent" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Sign consent" }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("sign_screening_consent_version", { _consent_id: "consent-1", _expected_version: 2 }));
    await screen.findByRole("status");
    expect(screen.queryByRole("button", { name: "Sign consent" })).not.toBeInTheDocument();
  });
  it("prepares a versioned text copy only after the download is audited", async () => {
    mocks.rpc.mockImplementation(async (name: string) => ({ data: name === "download_worker_screening" ? { record, document_url: null } : [record], error: null }));
    open();
    fireEvent.click(await screen.findByRole("button", { name: "Prepare text copy" }));
    await screen.findByRole("button", { name: "Download", exact: true });
    expect(mocks.rpc).toHaveBeenCalledWith("download_worker_screening", { _record_type: "consent", _record_id: "consent-1", _expected_version: 2 });
  });
  it("shows stale-version rejection without claiming the consent was signed", async () => {
    mocks.rpc.mockImplementation(async (name: string) => name === "sign_screening_consent_version"
      ? { data: null, error: new Error("Consent changed; reload and review the latest version") }
      : { data: [record], error: null });
    open();
    await screen.findByText(record.consent_text);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Sign consent" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Consent changed");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});