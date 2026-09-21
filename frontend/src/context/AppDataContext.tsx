import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { initialMaterials, initialProducts } from '../data/mockData'
import type { Material, Product } from '../types'

interface AppDataContextValue {
  materials: Material[]
  products: Product[]
  addMaterial: (material: Omit<Material, 'id'>) => void
  updateMaterial: (id: string, material: Omit<Material, 'id'>) => void
  deleteMaterial: (id: string) => void
  addProduct: (product: Omit<Product, 'id'>) => void
  updateProduct: (id: string, product: Omit<Product, 'id'>) => void
  deleteProduct: (id: string) => void
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined)

const MATERIALS_KEY = 'cost-calc:materials'
const PRODUCTS_KEY = 'cost-calc:products'

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [materials, setMaterials] = useState<Material[]>(() =>
    loadFromStorage(MATERIALS_KEY, initialMaterials),
  )
  const [products, setProducts] = useState<Product[]>(() =>
    loadFromStorage(PRODUCTS_KEY, initialProducts),
  )

  useEffect(() => {
    localStorage.setItem(MATERIALS_KEY, JSON.stringify(materials))
  }, [materials])

  useEffect(() => {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products))
  }, [products])

  const addMaterial: AppDataContextValue['addMaterial'] = (material) => {
    setMaterials((prev) => [...prev, { ...material, id: makeId('mat') }])
  }

  const updateMaterial: AppDataContextValue['updateMaterial'] = (id, material) => {
    setMaterials((prev) => prev.map((m) => (m.id === id ? { ...material, id } : m)))
  }

  const deleteMaterial: AppDataContextValue['deleteMaterial'] = (id) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id))
    setProducts((prev) =>
      prev.map((p) => ({
        ...p,
        recipe: p.recipe.filter((item) => item.materialId !== id),
      })),
    )
  }

  const addProduct: AppDataContextValue['addProduct'] = (product) => {
    setProducts((prev) => [...prev, { ...product, id: makeId('prod') }])
  }

  const updateProduct: AppDataContextValue['updateProduct'] = (id, product) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...product, id } : p)))
  }

  const deleteProduct: AppDataContextValue['deleteProduct'] = (id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <AppDataContext.Provider
      value={{
        materials,
        products,
        addMaterial,
        updateMaterial,
        deleteMaterial,
        addProduct,
        updateProduct,
        deleteProduct,
      }}
    >
      {children}
    </AppDataContext.Provider>
  )
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
