'use client'

import { useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { ServiceItem } from '@/lib/types'
import { Trash2 } from 'lucide-react'

interface ServiceItemRowProps {
  item: ServiceItem
  onChange: (item: ServiceItem) => void
  onRemove: () => void
  isLastRow?: boolean
  onAddLine?: () => void
}

export function ServiceItemRow({
  item,
  onChange,
  onRemove,
  isLastRow = false,
  onAddLine,
}: ServiceItemRowProps) {
  const nameRef = useRef<HTMLInputElement>(null)
  const qtyRef = useRef<HTMLInputElement>(null)
  const priceRef = useRef<HTMLInputElement>(null)

  const qty = Number(item.quantity) || 0
  const price = Number(item.unitPrice) || 0
  const total = qty * price

  const handleNameEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    e.stopPropagation()
    qtyRef.current?.focus()
  }

  const handleQtyEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    e.stopPropagation()
    priceRef.current?.focus()
  }

  const handlePriceEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as HTMLInputElement).blur()
    if (isLastRow && onAddLine) {
      requestAnimationFrame(() => onAddLine())
    }
  }

  return (
    <div className="grid grid-cols-12 items-end gap-x-2 gap-y-3 rounded-lg border border-border/70 bg-muted/15 p-3 md:items-center md:gap-2 md:rounded-none md:border-0 md:bg-transparent md:p-0">
      <div className="col-span-12 md:col-span-5">
        <span className="mb-1 block text-[11px] font-medium text-muted-foreground md:hidden">Descrição</span>
        <Input
          ref={nameRef}
          placeholder="Descrição do serviço (opcional)"
          value={item.name}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
          onKeyDown={handleNameEnter}
          className="bg-background min-h-[40px]"
        />
      </div>
      <div className="col-span-3 md:col-span-2">
        <span className="mb-1 block text-[11px] font-medium text-muted-foreground md:hidden">Quantidade</span>
        <Input
          ref={qtyRef}
          type="number"
          placeholder="Qtd"
          min={0}
          inputMode="numeric"
          value={item.quantity === undefined || item.quantity === null ? '' : item.quantity}
          onChange={(e) =>
            onChange({ ...item, quantity: e.target.value === '' ? 0 : Number(e.target.value) })
          }
          onKeyDown={handleQtyEnter}
          className="bg-background min-h-[40px]"
          aria-label="Quantidade do serviço"
        />
      </div>
      <div className="col-span-3 md:col-span-2">
        <span className="mb-1 block text-[11px] font-medium text-muted-foreground md:hidden">Valor unitário</span>
        <Input
          ref={priceRef}
          type="number"
          placeholder="Valor unit."
          min={0}
          step={0.01}
          value={item.unitPrice === undefined || item.unitPrice === null ? '' : item.unitPrice}
          onChange={(e) =>
            onChange({ ...item, unitPrice: e.target.value === '' ? 0 : Number(e.target.value) })
          }
          onKeyDown={handlePriceEnter}
          className="bg-background min-h-[40px]"
          aria-label="Valor unitário do serviço"
        />
      </div>
      <div className="col-span-4 text-right md:col-span-2">
        <span className="mb-1 block text-[11px] font-medium text-muted-foreground md:hidden">Total</span>
        <span className="text-sm font-medium text-foreground">
          {total > 0 ? total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
        </span>
      </div>
      <div className="col-span-2 flex justify-end md:col-span-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="min-h-11 min-w-11 text-muted-foreground hover:text-destructive"
          aria-label={`Remover serviço ${item.name || 'sem descrição'}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
