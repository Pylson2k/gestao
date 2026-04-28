import type { MaterialListItem } from '@/lib/types'
import type { MaterialLine } from '@/modules/calculator/engine/types'
import { resolveMaterialUnit } from '@/lib/material-units'

export function toMaterialListItems(lines: MaterialLine[]): MaterialListItem[] {
  return lines.map((line, index) => ({
    id: `calc-${index + 1}`,
    name: line.description,
    quantity: Number(line.quantity.toFixed(4)),
    unit: resolveMaterialUnit(line.unit),
    unitPrice: line.unitCost ?? 0,
  }))
}

