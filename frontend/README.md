# PrepMentor Frontend

React and Vite client for placement preparation, coding practice, interviews,
learning resources, resume building, and progress tracking.

## Development

Run these commands from this directory:

- `npm ci`: install locked dependencies.
- `npm run dev`: start both the frontend and backend.
- `npm run dev:client`: start only Vite when the backend is already running.
- `npm run lint`: check JavaScript and JSX.
- `npm test`: run frontend unit tests.
- `npm run build`: generate the production bundle in `dist/`.
- `npm run preview`: preview the production bundle locally.

Routes are defined in `src/App.jsx`. Active screens live in `src/pages/`,
shared UI in `src/components/`, and API clients in `src/services/`.

## Configuration and deployment

Copy `.env.example` to `.env` for local configuration. Set
`VITE_API_BASE_URL` to the backend origin, or leave it blank for local practice.
Never put private provider keys in frontend environment variables.

On Vercel, use `frontend` as the project root. Set `VITE_API_BASE_URL` to
the deployed HTTPS backend origin and rebuild after changing it.
`vercel.json` provides the build settings and SPA route rewrites.

See [the project README](../README.md) for backend setup and feature details.
