import { supabaseClient } from "../_shared/supabase.ts";
import { json, err } from "../_shared/utils.ts";

Deno.serve(async (req) => {
    if (req.method !== "POST") return err("method_not_allowed", 405);

    const supabase = supabaseClient(req);
    const { room_id, lat, lng, accuracy_m } = await req.json().catch(() => ({}));

    if (!room_id || typeof lat !== "number" || typeof lng !== "number") {
        return err("invalid_payload");
    }

    const { data, error } = await supabase.rpc("heartbeat", {
        p_room_id: room_id,
        p_lat: lat,
        p_lng: lng,
        p_accuracy_m: accuracy_m ?? 9999,
    });

    if (error) return err("heartbeat_failed", 400, { message: error.message });

    return json({ ok: true, data });
});