# Trae Preflight

This folder is prepared for `wangxt-978-1`.

Use `.env` for stable local ports and compose project identity:

- APP_PORT: 18278
- API_PORT: 19278
- WEB_PORT: 20278
- DB_PORT: 21278
- REDIS_PORT: 22278

Smoke entry:

```bash
bash scripts/smoke.sh
```

The preflight files are environment scaffolding only. The generated business
project can replace or extend them when needed.
