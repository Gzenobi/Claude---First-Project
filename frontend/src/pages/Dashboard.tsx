import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { StatCard } from '../components/StatCard'
import { useAppData } from '../context/AppDataContext'
import { calculateProductCost, formatCurrency } from '../utils/costCalculations'

export function Dashboard() {
  const { products, materials } = useAppData()

  const breakdowns = products.map((product) => ({
    product,
    breakdown: calculateProductCost(product, materials),
  }))

  const totalProducts = products.length
  const avgCost =
    breakdowns.reduce((sum, b) => sum + b.breakdown.totalCost, 0) / (totalProducts || 1)
  const avgMargin =
    products.reduce((sum, p) => sum + p.marginPercent, 0) / (totalProducts || 1)
  const avgPrice =
    breakdowns.reduce((sum, b) => sum + b.breakdown.suggestedPrice, 0) / (totalProducts || 1)

  const chartData = breakdowns.map(({ product, breakdown }) => ({
    name: product.name.length > 18 ? `${product.name.slice(0, 18)}…` : product.name,
    Costo: Math.round(breakdown.totalCost),
    Precio: Math.round(breakdown.suggestedPrice),
  }))

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-500">
          Resumen de costos y precios sugeridos de tus productos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Productos" value={String(totalProducts)} />
        <StatCard label="Materiales" value={String(materials.length)} />
        <StatCard label="Costo promedio" value={formatCurrency(avgCost)} />
        <StatCard
          label="Margen promedio"
          value={`${avgMargin.toFixed(0)}%`}
          hint={`Precio prom. sugerido: ${formatCurrency(avgPrice)}`}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">Costo vs. precio sugerido</h3>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="Costo" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Precio" fill="#0f172a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
