export default function OrcamentoLoading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6" aria-hidden="true">
      <div className="flex flex-col items-center gap-3">
        <div
          className="size-10 rounded-full border-2 border-primary border-t-transparent animate-spin"
          aria-label="Carregando orçamento"
        />
        <p className="text-sm text-muted-foreground font-medium">Carregando orçamento...</p>
      </div>
    </div>
  )
}
