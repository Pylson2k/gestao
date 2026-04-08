import { WorkerAuthProvider } from '@/contexts/worker-auth-context'

export default function TrabalhadorLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkerAuthProvider>
      <div className="min-h-dvh bg-muted/35 text-foreground antialiased">{children}</div>
    </WorkerAuthProvider>
  )
}
