'use client'

import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import type { ComponentProps } from 'react'

/**
 * Link do projeto: navegação rápida com prefetch no hover (desktop) e
 * prefetch={false} para primeiro clique/toque confiável (mobile).
 */
export function AppLink(props: ComponentProps<typeof NextLink>) {
  const router = useRouter()
  const { href, onMouseEnter, onFocus, ...rest } = props

  const prefetchHref = useCallback(() => {
    if (typeof href === 'string' && href.startsWith('/')) {
      router.prefetch(href)
    }
  }, [href, router])

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      prefetchHref()
      onMouseEnter?.(e)
    },
    [prefetchHref, onMouseEnter]
  )

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLAnchorElement>) => {
      prefetchHref()
      onFocus?.(e)
    },
    [prefetchHref, onFocus]
  )

  return (
    <NextLink
      prefetch={false}
      href={href}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      {...rest}
    />
  )
}

/** Mesmo componente, nome Link — use: import { Link } from '@/components/app-link' */
export { AppLink as Link }
