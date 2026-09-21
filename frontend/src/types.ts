export type Unit = 'kg' | 'g' | 'l' | 'ml' | 'unidad' | 'm' | 'm2'

export interface Material {
  id: string
  name: string
  unit: Unit
  unitCost: number
  supplier?: string
}

export interface RecipeItem {
  materialId: string
  quantity: number
}

export interface Product {
  id: string
  name: string
  category: string
  recipe: RecipeItem[]
  laborHours: number
  laborRatePerHour: number
  overheadPercent: number
  marginPercent: number
}

export interface ProductCostBreakdown {
  materialsCost: number
  laborCost: number
  subtotal: number
  overheadCost: number
  totalCost: number
  suggestedPrice: number
  profit: number
}
