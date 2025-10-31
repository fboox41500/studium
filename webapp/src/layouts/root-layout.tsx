import { NavLink, Outlet } from 'react-router-dom'

const navigation = [
  { href: '/', label: 'Overview' },
  { href: '/about', label: 'About' },
]

const currentYear = new Date().getFullYear()

export const RootLayout = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
        <div className="container flex items-center justify-between py-4">
          <NavLink to="/" className="text-lg font-semibold text-white">
            FastAPI + Vite Starter
          </NavLink>

          <nav className="flex gap-4 text-sm font-medium">
            {navigation.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  `rounded-full px-3 py-1 transition-colors ${
                    isActive
                      ? 'bg-brand-500 text-white shadow-floating'
                      : 'text-slate-200 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="container section-spacing">
        <Outlet />
      </main>

      <footer className="border-t border-slate-800 bg-slate-900/40">
        <div className="container flex flex-col gap-2 py-6 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} FastAPI Starter. All rights reserved.</p>
          <p className="text-slate-500">
            Build modern features quickly with React + TailwindCSS.
          </p>
        </div>
      </footer>
    </div>
  )
}
