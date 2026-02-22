import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function supabaseClient(req: Request) {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    return createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
});
}