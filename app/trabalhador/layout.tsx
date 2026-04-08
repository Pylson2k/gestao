import { WorkerAuthProvider } from '@/contexts/worker-auth-context'

export default function TrabalhadorLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkerAuthProvider>
      <div className="min-h-dvh bg-slate-950 text-slate-100 antialiased">{children}</div>
    </WorkerAuthProvider>
  )
}
