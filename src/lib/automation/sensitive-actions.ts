// Sensitive automation actions: the engine never runs these directly.
// They wait for a human decision. Mirrors private.automation_action_roles (the server is authoritative).

export type SensitiveAction = "launch_drug_test" | "generate_payroll" | "escalate_issue";

export const SENSITIVE_ACTIONS: Record<SensitiveAction, { label: string; description: string; approverRoles: string[] }> = {
  launch_drug_test: {
    label: "Launch Drug Test",
    description: "Orders a drug screening for the worker on the event.",
    approverRoles: ["agency_owner", "agency_admin", "compliance_specialist"],
  },
  generate_payroll: {
    label: "Generate Payroll",
    description: "Creates a draft payroll run (defaults to last Mon–Sun).",
    approverRoles: ["agency_owner", "agency_admin", "payroll", "payroll_specialist"],
  },
  escalate_issue: {
    label: "Escalate Issue",
    description: "Opens an urgent task and alerts agency admins.",
    approverRoles: ["agency_owner", "agency_admin", "account_manager", "dispatcher"],
  },
};

export function isSensitiveAction(type: string): type is SensitiveAction {
  return type in SENSITIVE_ACTIONS;
}

export function canApprove(action: string, roles: string[], requiredRoles?: string[]): boolean {
  if (roles.includes("super_admin")) return true;
  const allowed = requiredRoles?.length ? requiredRoles : isSensitiveAction(action) ? SENSITIVE_ACTIONS[action].approverRoles : [];
  return roles.some((r) => allowed.includes(r));
}
