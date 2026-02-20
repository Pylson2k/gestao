export default function DashboardLoading() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center p-6" aria-hidden="true">
      <div className="flex flex-col items-center gap-3">
        <div
          className="size-10 rounded-full border-2 border-primary border-t-transparent animate-spin"
          aria-label="Carregando"
        />
        <p className="text-sm text-muted-foreground font-medium">Carregando...</p>
      </div>
    </div>
  )
}
