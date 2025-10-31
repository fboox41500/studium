export const AboutPage = () => {
  return (
    <div className="space-y-10">
      <header className="max-w-2xl space-y-4">
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">Architecture overview</h1>
        <p className="text-base text-slate-300 sm:text-lg">
          This scaffold is tuned for teams shipping a FastAPI backend with a modern React frontend. It prioritises
          clarity, testability, and the ability to grow into domain-focused feature modules as requirements evolve.
        </p>
      </header>

      <section className="grid gap-6 sm:grid-cols-2">
        {architecture.map((item) => (
          <article
            key={item.title}
            className="rounded-3xl border border-slate-800/80 bg-slate-900/40 p-6 shadow-lg shadow-slate-950/60"
          >
            <h2 className="text-lg font-semibold text-white">{item.title}</h2>
            <p className="mt-3 text-sm text-slate-300">{item.description}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-800/80 bg-slate-900/40 p-6 shadow-lg shadow-slate-950/60">
        <h2 className="text-lg font-semibold text-white">Serving alongside FastAPI</h2>
        <p className="mt-3 text-sm text-slate-300">
          During development, Vite proxies API requests to your FastAPI server running on <code className="rounded bg-slate-800 px-1">http://localhost:8000</code> so that CORS
          configuration stays simple. When it is time to deploy, run <code className="rounded bg-slate-800 px-1">npm run build</code> and serve the generated
          <code className="rounded bg-slate-800 px-1">dist/</code> folder from FastAPI&apos;s static file mount.
        </p>
      </section>
    </div>
  )
}

const architecture = [
  {
    title: 'Feature-centric file system',
    description:
      'Organise UI, hooks, and services inside domain-specific directories under src/features and src/pages.',
  },
  {
    title: 'Composable layout system',
    description:
      'Layouts live in src/layouts and wrap groups of routes. Shared UI primitives reside in src/components.',
  },
  {
    title: 'Strict linting and formatting',
    description:
      'ESLint enforces best practices while Prettier keeps formatting consistent across the team.',
  },
  {
    title: 'Tailwind-powered design tokens',
    description:
      'Customisable theme tokens provide the foundation for consistent spacing, colour, and typography decisions.',
  },
]
