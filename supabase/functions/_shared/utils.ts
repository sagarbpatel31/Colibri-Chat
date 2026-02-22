export function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
});
}

export function err(code: string, status = 400, extra: Record<string, unknown> = {}) {
    return json({ ok: false, error: { code, ...extra } }, status);
}