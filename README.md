# Colibri Chat

A monorepo for the Colibri Chat application.

## Structure

```
colibri-chat/
  README.md
  .env.example
  docs/
    01_product_brief.md
    02_mvp_rules.md
    03_system_architecture.md
    04_api_contract.md
    05_moderation_pipeline.md
    06_ui_flow.md
    07_acceptance_tests.md
  supabase/
    migrations/
      001_init.sql
    policies/
      rls.sql
    functions/
      join-room/
        index.ts
      heartbeat/
        index.ts
      send-message/
        index.ts
      _shared/
        supabase.ts
        utils.ts
  apps/mobile/
```

## Getting Started

1. Copy `.env.example` to `.env` and fill in your Supabase credentials.
2. Read `docs/01_product_brief.md` for product context.
3. Deploy migrations with `supabase db push`.
4. Deploy functions with `supabase functions deploy`.

See `docs/` for detailed architecture and API contracts.