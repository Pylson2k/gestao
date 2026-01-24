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
  const total = item.quantity * item.unitPrice

  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <div className="col-span-12 sm:col-span-5">
        <Input
          placeholder="Nome do material"
          value={item.name}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
          className="bg-background"
        />
      </div>
      <div className="col-span-4 sm:col-span-2">
        <Input
          type="number"
          placeholder="Qtd"
          min={1}
          value={item.quantity || ''}
          onChange={(e) => onChange({ ...item, quantity: Number(e.target.value) || 0 })}
          className="bg-background"
        />
      </div>
      <div className="col-span-4 sm:col-span-2">
        <Input
          type="number"
          placeholder="Valor"
          min={0}
          step={0.01}
          value={item.unitPrice || ''}
          onChange={(e) => onChange({ ...item, unitPrice: Number(e.target.value) || 0 })}
          className="bg-background"
        />
      </div>
      <div className="col-span-3 sm:col-span-2 text-right">
        <span className="text-sm font-medium text-foreground">
          {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
