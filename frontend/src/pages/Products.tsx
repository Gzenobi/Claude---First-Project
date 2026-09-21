import { Link } from 'react-router-dom'
import { useAppData } from '../context/AppDataContext'
import { calculateProductCost, formatCurrency } from '../utils/costCalculations'

export function Products() {
  const { products, materials, deleteProduct } = useAppData()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Productos</h2>
          <p className="mt-1 text-sm text-slate-500">Costo y precio sugerido por producto.</p>
        </div>
        <Link
          to="/productos/nuevo"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          + Nuevo producto
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => {
          const breakdown = calculateProductCost(product, materials)
          return (
            <Link
              key={product.id}
              to={`/productos/${product.id}`}
              className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {product.category}
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-slate-900">{product.name}</h3>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (confirm(`¿Eliminar "${product.name}"?`)) deleteProduct(product.id)
                  }}
                  className="text-xs font-medium text-red-500 opacity-0 group-hover:opacity-100 hover:text-red-700"
                >
                  Eliminar
                </button>
              </div>
              <div className="flex items-end justify-between border-t border-slate-100 pt-3">
                <div>
                  <p className="text-xs text-slate-400">Costo total</p>
                  <p className="text-sm font-medium text-slate-700">
                    {formatCurrency(breakdown.totalCost)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Precio sugerido</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {formatCurrency(breakdown.suggestedPrice)}
                  </p>
                </div>
              </div>
            </Link>
          )
        })}
        {products.length === 0 && (
          <p className="col-span-full py-8 text-center text-slate-400">
            No hay productos todavía. Creá el primero.
          </p>
        )}
      </div>
    </div>
  )
}
