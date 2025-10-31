import { Link } from 'react-router-dom'

export const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="rounded-full border border-brand-500/40 bg-brand-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-brand-200">
        404
      </span>
      <h1 className="mt-6 text-3xl font-semibold text-white sm:text-4xl">Page not found</h1>
      <p className="mt-4 max-w-xl text-sm text-slate-300">
        The page you were looking for could not be found. Double-check the URL or return to the overview to
        continue exploring the application.
      </p>
      <Link
        to="/"
        className="mt-8 rounded-full bg-brand-500 px-8 py-3 text-sm font-semibold text-white shadow-floating transition hover:-translate-y-0.5 hover:bg-brand-400"
      >
        Back to overview
      </Link>
    </div>
  )
}
