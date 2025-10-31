import { Link } from 'react-router-dom'

export const HomePage = () => {
  return (
    <div className="space-y-16">
      <section className="text-center">
        <p className="text-sm uppercase tracking-wide text-brand-200">
          Welcome to your web workspace
        </p>
        <h1 className="mt-4 text-balance text-4xl font-semibold leading-tight text-white sm:text-5xl">
          Scaffolded React tooling for rapid product delivery
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-slate-300 sm:text-lg">
          This starter couples Vite, React, TypeScript, and Tailwind CSS to help you build rich,
          data-heavy interfaces. The project layout supports feature modules and plays nicely with
          a FastAPI backend.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            className="rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-floating transition-transform hover:-translate-y-0.5 hover:bg-brand-400"
            to="/about"
          >
            Explore the architecture
          </Link>
          <a
            className="rounded-full border border-slate-800/80 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-700 hover:text-white"
            href="https://fastapi.tiangolo.com/"
            target="_blank"
            rel="noreferrer"
          >
            Visit the FastAPI docs
          </a>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        {highlights.map((highlight) => (
          <div
            key={highlight.title}
            className="rounded-3xl border border-slate-800/80 bg-slate-900/40 p-6 text-left shadow-lg shadow-slate-950/50"
          >
            <h2 className="text-lg font-semibold text-white">{highlight.title}</h2>
            <p className="mt-3 text-sm text-slate-300">{highlight.description}</p>
          </div>
        ))}
      </section>
    </div>
  )
}

const highlights = [
  {
    title: 'Feature-first architecture',
    description:
      'Organize UI and state into dedicated feature folders, keeping shared components decoupled and maintainable.',
  },
  {
    title: 'Tailwind CSS design system',
    description:
      'Leverage a configurable theme and utility classes for fast prototyping with consistent spacing, colors, and typography.',
  },
  {
    title: 'API-ready development',
    description:
      'Proxy API routes locally and ship compiled assets to FastAPI for production hosting when you are ready.',
  },
  {
    title: 'Type-safe foundations',
    description:
      'Enjoy strict TypeScript settings, React Router 7, ESLint, and Prettier integration out of the box.',
  },
]
