# Contributing

1. Fork and clone, then follow the Quick start in the README.
2. Branch from `main`, keep changes small and focused.
3. Before opening a PR run `cd server && npx vitest run`, `cd client && npx vitest run` and `cd client && npm run build`.
4. Do not change REST route paths, response shapes or socket event names without updating the README API section.
5. Do not commit `.env` files or anything under `server/data/`.
