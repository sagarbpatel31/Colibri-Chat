export default async function handler(req: Request) {
  return new Response(JSON.stringify({ ok: true, ts: new Date().toISOString() }), { status: 200 });
}
