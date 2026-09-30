'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { MaterialItem } from '@/lib/types'
import {
  DEFAULT_MATERIAL_UNIT,
  MATERIAL_UNITS,
  formatQuantityDisplay,
  normalizeStoredQuantity,
  parseQuantityInput,
} from '@/lib/material-units'
import { Trash2 } from 'lucide-react'

interface MaterialItemRowProps {
  item: MaterialItem
  onChange: (item: MaterialItem) => void
  onRemove: () => void
  /** Exibe colunas de preço e total (orçamento / lista com valores). */
  showPrices?: boolean
  /** Na última linha, Enter após quantidade (sem preço) ou após valor (com preço) chama esta função — ex.: adicionar linha. */
  isLastRow?: boolean
  onAddLine?: () => void
}

export function MaterialItemRow({
  item,
  onChange,
  onRemove,
  showPrices = true,
  isLastRow = false,
  onAddLine,
}: MaterialItemRowProps) {
  const nameInputRef = useRef<HTMLInputElement>(null)
  const qtyInputRef = useRef<HTMLInputElement>(null)
  const priceInputRef = useRef<HTMLInputElement>(null)

  const qtyNum = Number(item.quantity)
  const safeQty = Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : 1
  const [quantityText, setQuantityText] = useState(() => formatQuantityDisplay(safeQty))

  useEffect(() => {
    const n = Number(item.quantity)
    const base = Number.isFinite(n) && n > 0 ? n : 1
    setQuantityText(formatQuantityDisplay(base))
  }, [item.id, item.quantity])

  const unit = item.unit && MATERIAL_UNITS.some((u) => u.value === item.unit) ? item.unit : DEFAULT_MATERIAL_UNIT
  const price = Number(item.unitPrice) || 0
  const total = safeQty * price

  const commitQuantity = (text: string, fallback: number) => {
    const parsed = parseQuantityInput(text)
    const n = normalizeStoredQuantity(parsed, fallback)
    onChange({ ...item, quantity: n })
    setQuantityText(formatQuantityDisplay(n))
  }

  const handleNameEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    e.stopPropagation()
    qtyInputRef.current?.focus()
  }

  const handleQtyEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    e.stopPropagation()
    commitQuantity(quantityText, safeQty)
    requestAnimationFrame(() => {
      if (showPrices) {
        priceInputRef.current?.focus()
      } else if (isLastRow && onAddLine) {
        onAddLine()
      }
    })
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

  const qtyCol = (
    <Input
      ref={qtyInputRef}
      inputMode="decimal"
      placeholder="Quantidade"
      aria-label="Quantidade"
      value={quantityText}
      onChange={(e) => setQuantityText(e.target.value)}
      onBlur={() => commitQuantity(quantityText, safeQty)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleQtyEnter(e)
      }}
      className="bg-background min-h-[40px]"
    />
  )

  const unitCol = (
    <Select
      value={unit}
      onValueChange={(v) => onChange({ ...item, unit: v, quantity: safeQty })}
    >
      <SelectTrigger className="min-h-[40px] bg-background w-full" aria-label="Unidade de medida">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {MATERIAL_UNITS.map((u) => (
          <SelectItem key={u.value} value={u.value}>
            {u.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  if (!showPrices) {
    return (
      <div className="grid grid-cols-12 items-end gap-x-2 gap-y-3 rounded-lg border border-border/70 bg-muted/15 p-3 md:items-center md:gap-2 md:rounded-none md:border-0 md:bg-transparent md:p-0">
        <div className="col-span-12 md:col-span-5">
          <span className="mb-1 block text-[11px] font-medium text-muted-foreground md:hidden">Descrição</span>
          <Input
            ref={nameInputRef}
            placeholder="Descrição do material"
            value={item.name}
            onChange={(e) => onChange({ ...item, name: e.target.value })}
            onKeyDown={handleNameEnter}
            className="bg-background min-h-[40px]"
          />
        </div>
        <div className="col-span-12 md:col-span-3">
          <span className="mb-1 block text-[11px] font-medium text-muted-foreground md:hidden">Quantidade</span>
          {qtyCol}
        </div>
        <div className="col-span-10 md:col-span-3">
          <span className="mb-1 block text-[11px] font-medium text-muted-foreground md:hidden">Unidade</span>
          {unitCol}
        </div>
        <div className="col-span-2 sm:col-span-1 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="min-h-11 min-w-11 shrink-0 text-muted-foreground hover:text-destructive"
            aria-label={`Remover material ${item.name || 'sem descrição'}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-12 items-end gap-x-2 gap-y-3 rounded-lg border border-border/70 bg-muted/15 p-3 md:items-center md:gap-2 md:rounded-none md:border-0 md:bg-transparent md:p-0">
      <div className="col-span-12 md:col-span-3">
        <span className="mb-1 block text-[11px] font-medium text-muted-foreground md:hidden">Descrição</span>
        <Input
          ref={nameInputRef}
          placeholder="Descrição do material (opcional)"
          value={item.name}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
          onKeyDown={handleNameEnter}
          className="bg-background min-h-[40px]"
        />
      </div>
      <div className="col-span-12 md:col-span-2">
        <span className="mb-1 block text-[11px] font-medium text-muted-foreground md:hidden">Quantidade</span>
        {qtyCol}
      </div>
      <div className="col-span-12 md:col-span-2">
        <span className="mb-1 block text-[11px] font-medium text-muted-foreground md:hidden">Unidade</span>
        {unitCol}
      </div>
      <div className="col-span-5 md:col-span-2">
        <span className="mb-1 block text-[11px] font-medium text-muted-foreground md:hidden">Valor unitário</span>
        <Input
          ref={priceInputRef}
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
          aria-label="Valor unitário"
        />
      </div>
      <div className="col-span-5 text-right md:col-span-2">
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
          className="min-h-11 min-w-11 shrink-0 text-muted-foreground hover:text-destructive"
          aria-label={`Remover material ${item.name || 'sem descrição'}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
