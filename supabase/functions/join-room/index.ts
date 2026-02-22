import { getSupabase } from '../_shared/supabase';

export default async function handler(req: Request) {
  try {
    const { roomId, userId } = await req.json();
    const { supabase } = getSupabase();

    // simple place-holder: ensure room exists
    const { data: room, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (error || !room) {
      return new Response(JSON.stringify({ error: 'Room not found' }), { status: 404 });
    }

    // In a real function we would insert presence or membership
    return new Response(JSON.stringify({ ok: true, room }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
}
