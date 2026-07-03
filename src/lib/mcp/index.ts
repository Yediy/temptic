import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTicketsTool from "./tools/list-tickets";
import getTicketTool from "./tools/get-ticket";
import listClientsTool from "./tools/list-clients";
import listWorkersTool from "./tools/list-workers";

// The OAuth issuer must be the direct Supabase host. Read the project ref from
// Vite's compile-time env so this module stays import-safe (no runtime env reads
// or throws at module top level).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "temptic-mcp",
  title: "Temp Tic MCP",
  version: "0.1.0",
  instructions:
    "Read-only tools for a Temp Tic agency account. Use list_tickets to browse labor tickets, get_ticket for full details, and list_clients / list_workers to look up an agency's clients and workers. All tools respect the signed-in user's tenant scope.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTicketsTool, getTicketTool, listClientsTool, listWorkersTool],
});
