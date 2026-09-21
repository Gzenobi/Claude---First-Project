import { useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import type { Material, Unit } from '../types'
import { formatCurrency } from '../utils/costCalculations'

const units: Unit[] = ['kg', 'g', 'l', 'ml', 'unidad', 'm', 'm2']

type FormState = Omit<Material, 'id'>

const emptyForm: FormState = { name: '', unit: 'kg', unitCost: 0, supplier: '' }

export function Materials() {
  const { materials, addMaterial, updateMaterial, deleteMaterial } = useAppData()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [showForm, setShowForm] = useState(false)

  function openNew() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEdit(material: Material) {
    setEditingId(material.id)
    setForm({ name: material.name, unit: material.unit, unitCost: material.unitCost, supplier: material.supplier ?? '' })
    setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || form.unitCost < 0) return
    if (editingId) {
      updateMaterial(editingId, form)
    } else {
      addMaterial(form)
    }
    setShowForm(false)
    setForm(emptyForm)
    setEditingId(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Materiales</h2>
          <p className="mt-1 text-sm text-slate-500">Insumos y su costo unitario.</p>
        </div>
        <button
          onClick={openNew}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          + Nuevo material
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-600">Nombre</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-600">Unidad</span>
            <select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value as Unit })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-600">Costo por unidad</span>
            <input
              required
              type="number"
              min={0}
              step="0.01"
              value={form.unitCost}
              onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-600">Proveedor</span>
            <input
              value={form.supplier}
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </label>
          <div className="col-span-full flex gap-3">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              {editingId ? 'Guardar cambios' : 'Agregar material'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3">Nombre</th>
              <th className="px-5 py-3">Unidad</th>
              <th className="px-5 py-3">Costo unitario</th>
              <th className="px-5 py-3">Proveedor</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {materials.map((material) => (
              <tr key={material.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-medium text-slate-800">{material.name}</td>
                <td className="px-5 py-3 text-slate-500">{material.unit}</td>
                <td className="px-5 py-3 text-slate-700">{formatCurrency(material.unitCost)}</td>
                <td className="px-5 py-3 text-slate-500">{material.supplier || '—'}</td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => openEdit(material)}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteMaterial(material.id)}
                      className="text-xs font-medium text-red-500 hover:text-red-700"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {materials.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                  No hay materiales cargados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
