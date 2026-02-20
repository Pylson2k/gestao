'use client'

import NextLink from 'next/link'
import type { ComponentProps } from 'react'

/**
 * Link do projeto: prefetch={false} para responder no primeiro clique/toque
 * (evita duplo clique no mobile/iOS). Use este em todo o projeto em vez de next/link.
 */
export function AppLink(props: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={false} {...props} />
}

/** Mesmo componente, nome Link — use: import { Link } from '@/components/app-link' */
export { AppLink as Link }
