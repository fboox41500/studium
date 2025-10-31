# Web application scaffold

This project bootstraps a modern React + TypeScript experience powered by Vite. It ships with Tailwind CSS,
React Router, ESLint, and Prettier so that you can focus on shipping product features instead of rebuilding
plumbing.

## Getting started

```bash
# Install dependencies
npm install

# Start the local dev server on http://localhost:5173
npm run dev
```

The Vite dev server proxies `/api` requests to `http://localhost:8000` so that it can talk to a FastAPI server
running locally without additional CORS configuration. Update the proxy inside `vite.config.ts` if your backend
lives elsewhere.

## Available scripts

| Command            | Description                                                      |
| ------------------ | ---------------------------------------------------------------- |
| `npm run dev`      | Starts the Vite development server with hot module reloading.     |
| `npm run build`    | Type-checks the codebase and produces an optimised production build in `dist/`. |
| `npm run preview`  | Serves the production build locally to validate deployment artefacts. |
| `npm run lint`     | Runs ESLint against all TypeScript files.                         |
| `npm run lint:fix` | Attempts to auto-fix lint issues where possible.                  |
| `npm run typecheck`| Runs TypeScript project references without emitting output.       |
| `npm run format`   | Formats the repository with Prettier (with caching enabled).      |
| `npm run format:check` | Checks for formatting issues without writing changes.        |

## Project structure

```
webapp/
├── public/                  # Static assets copied as-is to the build output
├── src/
│   ├── layouts/             # Layout shells that wrap nested route segments
│   ├── pages/               # High-level, routed pages
│   ├── routes/              # Centralised router configuration
│   ├── components/          # Shared, reusable UI primitives (add as needed)
│   ├── features/            # Feature modules for cohesive domain slices (create per feature)
│   └── index.css            # Tailwind entry-point & global styles
├── eslint.config.js         # Flat ESLint configuration with Prettier integration
├── tailwind.config.js       # Tailwind theme tokens & scanning paths
├── postcss.config.js        # Tailwind & autoprefixer integration
├── tsconfig*.json           # TypeScript project references and path aliases
└── vite.config.ts           # Vite configuration (aliases, dev server proxy, etc.)
```

The `src/features` directory is intentionally empty: add a folder per domain (e.g. `features/auth`) to keep
components, hooks, and services close to the behaviours they implement.

## Styling with Tailwind CSS

Tailwind is set up with a small design token preset (`brand` colour, spacing helpers, shadows) and includes the
`prettier-plugin-tailwindcss` plugin to automatically sort utility classes. Extend `tailwind.config.js` with
additional tokens as your design language evolves.

## Deploying alongside FastAPI

When you are ready to integrate with FastAPI, build the frontend and mount the `dist/` directory as static files
inside your FastAPI application:

```bash
npm run build
```

The generated assets can be served with `StaticFiles` in FastAPI:

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI()
app.mount('/', StaticFiles(directory='dist', html=True), name='web')
```

Point your FastAPI templates or root route at the compiled `index.html`, and the frontend router will handle the
rest.
