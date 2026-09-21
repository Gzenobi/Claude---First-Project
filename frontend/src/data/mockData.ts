import type { Material, Product } from '../types'

export const initialMaterials: Material[] = [
  { id: 'mat-1', name: 'Harina 000', unit: 'kg', unitCost: 850, supplier: 'Molino San Juan' },
  { id: 'mat-2', name: 'Azúcar', unit: 'kg', unitCost: 1100, supplier: 'Ingenio Ledesma' },
  { id: 'mat-3', name: 'Manteca', unit: 'kg', unitCost: 4200, supplier: 'La Serenísima' },
  { id: 'mat-4', name: 'Huevo', unit: 'unidad', unitCost: 180, supplier: 'Granja Los Pinos' },
  { id: 'mat-5', name: 'Chocolate cobertura', unit: 'kg', unitCost: 6800, supplier: 'Cacao SRL' },
  { id: 'mat-6', name: 'Caja packaging', unit: 'unidad', unitCost: 220, supplier: 'Cartonpack' },
  { id: 'mat-7', name: 'Leche', unit: 'l', unitCost: 950, supplier: 'La Serenísima' },
]

export const initialProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Torta de chocolate (1kg)',
    category: 'Tortas',
    recipe: [
      { materialId: 'mat-1', quantity: 0.4 },
      { materialId: 'mat-2', quantity: 0.3 },
      { materialId: 'mat-3', quantity: 0.2 },
      { materialId: 'mat-4', quantity: 4 },
      { materialId: 'mat-5', quantity: 0.25 },
      { materialId: 'mat-6', quantity: 1 },
    ],
    laborHours: 1.5,
    laborRatePerHour: 3500,
    overheadPercent: 15,
    marginPercent: 40,
  },
  {
    id: 'prod-2',
    name: 'Docena de facturas',
    category: 'Panificados',
    recipe: [
      { materialId: 'mat-1', quantity: 0.5 },
      { materialId: 'mat-3', quantity: 0.15 },
      { materialId: 'mat-2', quantity: 0.1 },
      { materialId: 'mat-4', quantity: 2 },
      { materialId: 'mat-6', quantity: 1 },
    ],
    laborHours: 0.8,
    laborRatePerHour: 3500,
    overheadPercent: 12,
    marginPercent: 35,
  },
  {
    id: 'prod-3',
    name: 'Bombones surtidos (caja x12)',
    category: 'Bombonería',
    recipe: [
      { materialId: 'mat-5', quantity: 0.35 },
      { materialId: 'mat-7', quantity: 0.1 },
      { materialId: 'mat-6', quantity: 1 },
    ],
    laborHours: 1.2,
    laborRatePerHour: 3500,
    overheadPercent: 18,
    marginPercent: 50,
  },
]
