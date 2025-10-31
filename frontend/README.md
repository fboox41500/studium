# Frontend API Client

This package hosts the typed API client and React hooks used by the new frontend to
communicate with the ORD FastAPI backend. The client wraps the following endpoints
and normalises pagination, error handling, cancellation, and loading state
management:

- `POST /ord/reactions/search`
- `GET /ord/reactions/{id}`
- `POST /ord/reactions/batch`
- `GET /ord/datasets`
- `POST /ord/reactions/download`
- Background query submission & polling
- Reaction HTML visualisation fetcher

## Getting started

1. Copy `.env.example` to `.env` and set the base URL of the ORD backend.
   ```bash
   cp frontend/.env.example frontend/.env
   ```

   | Scenario                        | Value example                         |
   | ------------------------------ | ------------------------------------- |
   | Local FastAPI server (default) | `http://localhost:8000`               |
   | Remote staging server          | `https://staging-api.your-domain.com` |
   | Production server              | `https://api.your-domain.com`         |

   The client reads the base URL from the following environment variables (first
   match wins):

   - `VITE_API_BASE_URL`
   - `NEXT_PUBLIC_API_BASE_URL`
   - `REACT_APP_API_BASE_URL`

   This covers the default conventions used by Vite, Next.js, and Create React App.

2. Install dependencies and build your frontend normally. The modules provided in
   this directory are framework-agnostic and work with any bundler capable of
   compiling TypeScript/ESM modules (Vite, Next.js, CRA, etc.).

3. Import the client or the supplied hooks anywhere in your React application:

   ```tsx
   import { useOrdApiClient, useReactionSearch } from './src';

   const SearchPage = () => {
     const client = useOrdApiClient();
     const { data, loading, error, page, setPage } = useReactionSearch(client, {
       query: 'Suzuki coupling',
       filters: { temperature: { min: 20, max: 120 } },
       pageSize: 25,
     });

     if (loading && !data) return <p>Loading…</p>;
     if (error) return <p>Error: {error.message}</p>;

     return (
       <div>
         <p>Total reactions: {data?.total ?? 0}</p>
         <button onClick={() => setPage(page + 1)}>Next page</button>
       </div>
     );
   };
   ```

## Project structure

```
frontend/
 ├── .env.example          # Default environment configuration
 ├── README.md             # You are here
 └── src/
     ├── api/              # Typed client, HTTP utilities, and type definitions
     ├── hooks/            # React hooks built on top of the client
     └── utils/            # Shared utilities (e.g. serialisation helpers)
```

## Available exports

### API client

- `createOrdApiClient`, `OrdApiClient`
- `resolveApiBaseUrl`, `setApiBaseUrl`, `getConfiguredApiBaseUrl`
- Typed request/response models under `src/api/types`

### React hooks

- `useOrdApiClient` — memoises an `OrdApiClient` instance using environment configuration
- `useReactionSearch` — paginated search with caching, pagination helpers, and cancellation
- `useReactionDetail` and `useReactionBatch` — retrieve individual reactions or batches by identifier
- `useDatasets` — paginated dataset listing
- `useReactionDownload` — trigger downloads and monitor background progress
- `useBackgroundReactionQuery` — submit long-running queries and poll their status
- `useReactionVisualisation` — fetch HTML/SVG reaction previews

All hooks expose consistent loading, error, cancellation, and refetch semantics via the shared `useAbortableAsync` utility.

## Environment switching

To point the client at a different backend instance, update the `.env` file
mentioned above or provide the variable via your hosting environment. For
example:

- **Local development**: `VITE_API_BASE_URL=http://localhost:8000`
- **Preview deployment**: `VITE_API_BASE_URL=https://preview-api.example.com`
- **Production**: `VITE_API_BASE_URL=https://api.example.com`

Remember to reload your development server after changing environment variables
so that the bundler picks up the new value.
