'use client'

import NextLink from 'next/link'
import type { ComponentProps } from 'react'

/**
 * Link com prefetch={false} para evitar necessidade de clicar 2x
 * (especialmente em mobile/iOS com Next.js prefetch ativo).
 */
export function AppLink(props: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={false} {...props} />
}
