import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const state = vi.hoisted(() => ({ roles: ["compliance_specialist"], queries: [] as string[] }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: "u1" }, roles: state.roles, agencyId: "agency-a", loading: false }) }));
vi.mock("@tanstack/react-query", () => ({ useQuery: ({ queryKey }: { queryKey: string[] }) => {
  state.queries.push(queryKey[0]);
  const data = queryKey[0] === "compliance-screening" ? [{ id: "report-1", type: "report", worker: "worker-1", status: "clear", date: null, version: 4, provider: "mock" }]
    : queryKey[0] === "compliance-trail" ? [{ id: "access-1", action: "read", record_type: "report", record_id: "report-1", document_version: 4, actor_user_id: "u1", actor_roles: ["compliance_specialist"], created_at: null }]
    : queryKey[0] === "compliance-open-findings" ? [{ id: "finding-1", status: "expired", identity_id: "worker-1", next_action_at: null, expires_at: null, woic_compliance_rules: { name: "Expired credential" } }] : [];
  return { data, error: null, isLoading: false, isFetching: false, refetch: vi.fn() };
} }));
import ComplianceReport from "./ComplianceReport";
import { ProtectedRoute } from "@/components/ProtectedRoute";

function open() {
  render(<MemoryRouter initialEntries={["/compliance"]}><Routes><Route element={<ProtectedRoute allowedRoles={["super_admin", "agency_admin", "agency_owner", "compliance_specialist"]} />}><Route path="/compliance" element={<ComplianceReport />} /></Route><Route path="/unauthorized" element={<p>Denied</p>} /></Routes></MemoryRouter>);
}
describe("compliance review access", () => {
  beforeEach(() => { state.roles = ["compliance_specialist"]; state.queries = []; });
  it("lets a compliance specialist review versioned screening, access and agency findings", () => {
    open();
    expect(screen.getByText("v4")).toBeInTheDocument();
    const trail = screen.getByRole("tab", { name: "Access trail" });
    fireEvent.mouseDown(trail, { button: 0, ctrlKey: false }); fireEvent.click(trail);
    expect(screen.getByText("read")).toBeInTheDocument();
    const findings = screen.getByRole("tab", { name: "Open findings" });
    fireEvent.mouseDown(findings, { button: 0, ctrlKey: false }); fireEvent.click(findings);
    expect(screen.getByText("Expired credential")).toBeInTheDocument();
    expect(screen.getByText("Platform security findings are restricted to super administrators.")).toBeInTheDocument();
  });
  it("denies workers before any compliance query runs", () => {
    state.roles = ["worker_user"];
    open();
    expect(screen.getByText("Denied")).toBeInTheDocument();
    expect(state.queries).toHaveLength(0);
  });
});