# MediQ client

React 18 + Vite + Tailwind single-page app. Views are switched by tabs in `src/App.jsx`.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs dist/
npx vitest run   # tests
```

Set `VITE_API_URL` in `.env` to point at the backend (default `http://localhost:5000`).

Layout:

- `src/pages/` one component per screen (booking, tracker, TV, reception, doctor desk, analytics)
- `src/components/` shared modals, navbar, toast, chime
- `src/context/` auth state and the Socket.io connection
- `src/services/api.js` REST client
