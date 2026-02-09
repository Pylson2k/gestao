'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { MaterialItem } from '@/lib/types'
import { Trash2 } from 'lucide-react'

interface MaterialItemRowProps {
  item: MaterialItem
  onChange: (item: MaterialItem) => void
  onRemove: () => void
}

export function MaterialItemRow({ item, onChange, onRemove }: MaterialItemRowProps) {
  const qty = Number(item.quantity) || 0
  const price = Number(item.unitPrice) || 0
  const total = qty * price

  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <div className="col-span-12 sm:col-span-5">
        <Input
          placeholder="Nome do material (opcional)"
          value={item.name}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
          className="bg-background"
        />
      </div>
      <div className="col-span-4 sm:col-span-2">
        <Input
          type="number"
          placeholder="Qtd"
          min={0}
          value={item.quantity == null || item.quantity === 0 ? '' : item.quantity}
          onChange={(e) => {
            const v = e.target.value
            onChange({ ...item, quantity: v === '' ? 0 : Number(v) || 0 })
          }}
          className="bg-background"
        />
      </div>
      <div className="col-span-4 sm:col-span-2">
        <Input
          type="number"
          placeholder="Valor unit."
          min={0}
          step={0.01}
          value={item.unitPrice == null || item.unitPrice === 0 ? '' : item.unitPrice}
          onChange={(e) => {
            const v = e.target.value
            onChange({ ...item, unitPrice: v === '' ? 0 : Number(v) || 0 })
          }}
          className="bg-background"
        />
      </div>
      <div className="col-span-3 sm:col-span-2 text-right">
        <span className="text-sm font-medium text-foreground">
          {total > 0 ? total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
        </span>
      </div>
      <div className="col-span-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
