import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const authState = { user: { id: "u1" } as unknown, roles: ["agency_admin"] as string[], loading: false };
vi.mock("@/lib/auth", () => ({ useAuth: () => authState }));

vi.mock("@/hooks/memory/use-memory", async (orig) => {
  const actual = await orig<typeof import("@/hooks/memory/use-memory")>();
  return {
    ...actual,
    useMemorySettings: () => [{ refreshMs: 0 }, () => {}],
    useMemoryCapability: () => ({ status: "ok", data: { active_sessions: 3 }, message: null, refetch: () => {} }),
    useMemoryPermissions: () => ({ data: [], isLoading: false }),
  };
});

import { ProtectedRoute } from "@/components/ProtectedRoute";
import MemoryLayout from "@/pages/memory/MemoryLayout";
import MemoryOverview from "@/pages/memory/MemoryOverview";

// Mirrors the /memory route registration in src/App.tsx.
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<ProtectedRoute allowedRoles={["agency_admin", "super_admin"]} redirectTo="/unauthorized" />}>
          <Route path="/memory" element={<MemoryLayout />}>
            <Route index element={<MemoryOverview />} />
          </Route>
        </Route>
        <Route path="/unauthorized" element={<p>Unauthorized page</p>} />
        <Route path="*" element={<p>Not found page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("/memory smoke", () => {
  beforeEach(() => { authState.roles = ["agency_admin"]; authState.user = { id: "u1" }; });

  it("renders the Memory Overview for an agency admin", () => {
    renderAt("/memory");
    expect(screen.getByRole("heading", { name: "Working Memory" })).toBeInTheDocument();
    expect(screen.getAllByText("Active Sessions").length).toBeGreaterThan(0);
    expect(screen.queryByText("Not found page")).not.toBeInTheDocument();
  });

  it("sends a worker to the unauthorized page, not NotFound", () => {
    authState.roles = ["worker_user"];
    renderAt("/memory");
    expect(screen.getByText("Unauthorized page")).toBeInTheDocument();
  });
});
