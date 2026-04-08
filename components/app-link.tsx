'use client'

import NextLink from 'next/link'
import type { ComponentProps } from 'react'

/**
 * Encapsula o Link do Next.js para import único no app.
 * Evite `<Link><Button/></Link>` (HTML inválido); use `<Button asChild><Link/></Button>`.
 */
export function AppLink(props: ComponentProps<typeof NextLink>) {
  return <NextLink {...props} />
}

export { AppLink as Link }
