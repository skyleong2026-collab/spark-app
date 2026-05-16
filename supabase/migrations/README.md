# Supabase Migrations

Migration files are applied in lexicographic order. Name them:

```
YYYYMMDDHHMMSS_description.sql
```

For example: `20260418120000_heart_assessments_v2.sql`

This directory is for going-forward migrations only. The existing production schema
is not captured here — it was applied manually before this directory was created.
