## Add DocRaptor API key

Store the DocRaptor API key you pasted as a Supabase Edge Function secret named `DOCRAPTOR_API_KEY` so it's available to backend code via `Deno.env.get("DOCRAPTOR_API_KEY")`.

### Steps
1. Call `secrets--add_secret` for `DOCRAPTOR_API_KEY` (you'll confirm the value in the secure form — please rotate the key you pasted in chat, since inline secrets should be considered exposed).
2. No code changes yet — wiring DocRaptor into a specific edge function (e.g. PDF generation) is a separate task.

### Note
You currently use a Puppeteer-based `generate-pdf` edge function. Let me know if you want a follow-up plan to switch PDF rendering to DocRaptor.