import { getSupabase } from '../_shared/supabase';

export default async function handler(req: Request) {
  try {
    const { roomId, senderId, content } = await req.json();
    const { supabase } = getSupabase();

    const { data, error } = await supabase
      .from('messages')
      .insert([{ room_id: roomId, sender_id: senderId, content }])
      .select()
      .single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

    return new Response(JSON.stringify({ ok: true, message: data }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
}
