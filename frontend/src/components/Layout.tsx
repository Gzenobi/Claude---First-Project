import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/productos', label: 'Productos' },
  { to: '/materiales', label: 'Materiales' },
]

export function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="flex w-60 flex-col border-r border-slate-200 bg-white">
        <div className="px-5 py-6">
          <h1 className="text-lg font-semibold tracking-tight">CostoApp</h1>
          <p className="text-xs text-slate-500">Calculadora de costos</p>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto px-5 py-4 text-xs text-slate-400">
          Datos de prueba — sin backend conectado
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
