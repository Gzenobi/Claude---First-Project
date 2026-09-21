import { Link, Navigate, useParams } from 'react-router-dom'
import { useAppData } from '../context/AppDataContext'
import { calculateProductCost, formatCurrency } from '../utils/costCalculations'

export function ProductDetail() {
  const { id } = useParams()
  const { products, materials } = useAppData()
  const product = products.find((p) => p.id === id)

  if (!product) return <Navigate to="/productos" replace />

  const breakdown = calculateProductCost(product, materials)

  const rows = [
    { label: 'Costo de materiales', value: breakdown.materialsCost },
    { label: 'Costo de mano de obra', value: breakdown.laborCost },
    { label: 'Subtotal', value: breakdown.subtotal, emphasis: true },
    { label: `Gastos generales (${product.overheadPercent}%)`, value: breakdown.overheadCost },
    { label: 'Costo total', value: breakdown.totalCost, emphasis: true },
    { label: `Margen (${product.marginPercent}%)`, value: breakdown.profit },
    { label: 'Precio sugerido', value: breakdown.suggestedPrice, emphasis: true, highlight: true },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/productos" className="text-sm text-slate-500 hover:text-slate-700">
            ← Volver a productos
          </Link>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            {product.category}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">{product.name}</h2>
        </div>
        <Link
          to={`/productos/${product.id}/editar`}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Editar producto
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">Receta / materiales</h3>
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="py-2">Material</th>
                <th className="py-2">Cantidad</th>
                <th className="py-2 text-right">Costo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {product.recipe.map((item) => {
                const material = materials.find((m) => m.id === item.materialId)
                if (!material) return null
                return (
                  <tr key={item.materialId}>
                    <td className="py-2 text-slate-700">{material.name}</td>
                    <td className="py-2 text-slate-500">
                      {item.quantity} {material.unit}
                    </td>
                    <td className="py-2 text-right text-slate-700">
                      {formatCurrency(material.unitCost * item.quantity)}
                    </td>
                  </tr>
                )
              })}
              {product.recipe.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-slate-400">
                    Sin materiales asignados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-slate-400">
            Mano de obra: {product.laborHours} h × {formatCurrency(product.laborRatePerHour)}/h ={' '}
            {formatCurrency(breakdown.laborCost)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">Desglose de costos</h3>
          <div className="mt-3 divide-y divide-slate-100">
            {rows.map((row) => (
              <div
                key={row.label}
                className={`flex items-center justify-between py-2.5 text-sm ${
                  row.highlight ? 'rounded-lg bg-slate-900 px-3 text-white' : ''
                }`}
              >
                <span className={row.emphasis ? 'font-semibold' : 'text-slate-500'}>
                  {row.label}
                </span>
                <span className={row.emphasis ? 'font-semibold' : 'text-slate-700'}>
                  {formatCurrency(row.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
