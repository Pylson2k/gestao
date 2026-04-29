import { PropsWithChildren } from 'react'

export function V2Shell({ children }: PropsWithChildren) {
  return (
    <main className="mx-auto w-full max-w-6xl p-4 md:p-8">
      <div className="surface-card rounded-2xl p-4 md:p-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Gestao v2</h1>
          <p className="text-sm text-muted-foreground">
            Nova interface progressiva com backend Rust versionado.
          </p>
        </header>
        {children}
      </div>
    </main>
  )
}
