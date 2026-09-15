# Repository Guidelines

## Project Structure & Module Organization

PrepMentor contains a React 19/Vite client and a dependency-free Node API. Frontend code lives in `frontend/src/`: screens are in `pages/`, shared UI in `components/`, providers in `context/`, API clients in `services/`, and static question banks in `data/`. Routing is centralized in `frontend/src/App.jsx`. Backend routes and authentication live in `backend/src/`; integration tests live in `backend/test/`. Runtime user data under `backend/data/` is ignored by Git. `ai-service/` is reserved for a future model service.

## Build, Test, and Development Commands

Run frontend commands from `frontend/`:

- `npm install` installs the locked dependencies from `package-lock.json`.
- `npm run dev` starts the Vite development server with hot reload.
- `npm run build` creates a production bundle in `frontend/dist/`.
- `npm run preview` serves the production bundle locally.
- `npm run lint` checks JavaScript and JSX with ESLint.
- `npm test` runs dependency-free frontend unit tests with Node's test runner.

Run backend commands from `backend/`: `npm run dev` starts the API, `npm run check` validates syntax, and `npm test` runs isolated API integration tests.

## Coding Style & Naming Conventions

Use ES modules, JSX, two-space indentation, semicolons, and double quotes, matching the existing source. Name React components and page files in PascalCase (`PlacementCoding.jsx`); use camelCase for functions, hooks, state, and handlers (`handleSubmit`). Keep context modules named `*Context.jsx` and expose custom hooks such as `usePlacement`. Prefer Tailwind utility classes for shared visual consistency; preserve existing component-local styles when making focused changes. Run `npm run lint` before submitting work.

## Testing Guidelines

Both workspaces use Node's built-in `node:test` runner. Name tests `*.test.js` under `frontend/test/` or `backend/test/`; backend tests must use isolated temporary storage. Verify frontend changes with tests, lint, a production build, and manual navigation. For Placement changes, test refresh persistence and locked, available, failed, and passed states.

## Commit & Pull Request Guidelines

Recent commits use concise, lowercase, imperative subjects, for example `build interview setup page` and `add global dark and light mode support`. Keep each commit focused on one logical change. Pull requests should explain behavior changes, list verification commands, link relevant issues, and include screenshots for UI updates. Call out routing, localStorage, or progression-state changes explicitly, and avoid unrelated refactors.

## State & Configuration Notes

Local-mode authentication, theme, and Placement progress are browser-persisted through React contexts and localStorage. Remote-mode accounts are handled by the backend; development user data is never committed. Do not put secrets in client code. Preserve the sequential Placement unlock rules when changing assessment flows.
