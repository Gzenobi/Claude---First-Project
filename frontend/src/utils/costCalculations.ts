import type { Material, Product, ProductCostBreakdown } from '../types'

export function calculateProductCost(
  product: Product,
  materials: Material[],
): ProductCostBreakdown {
  const materialsCost = product.recipe.reduce((sum, item) => {
    const material = materials.find((m) => m.id === item.materialId)
    if (!material) return sum
    return sum + material.unitCost * item.quantity
  }, 0)

  const laborCost = product.laborHours * product.laborRatePerHour
  const subtotal = materialsCost + laborCost
  const overheadCost = subtotal * (product.overheadPercent / 100)
  const totalCost = subtotal + overheadCost
  const suggestedPrice = totalCost * (1 + product.marginPercent / 100)
  const profit = suggestedPrice - totalCost

  return {
    materialsCost,
    laborCost,
    subtotal,
    overheadCost,
    totalCost,
    suggestedPrice,
    profit,
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(value)
}
