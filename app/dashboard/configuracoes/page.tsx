'use client'

import { useState, useRef, useEffect } from 'react'
import { useCompany } from '@/contexts/company-context'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Settings, Upload, X, CheckCircle2, Loader2, Database, Download, AlertTriangle } from 'lucide-react'

export default function SettingsPage() {
  const { settings, updateSettings, updateLogo, removeLogo, isLoading } = useCompany()
  const { user } = useAuth()
  const [formData, setFormData] = useState(settings)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const restoreFileRef = useRef<HTMLInputElement>(null)
  const [backupLoading, setBackupLoading] = useState(false)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [backupError, setBackupError] = useState<string | null>(null)
  const [restoreResult, setRestoreResult] = useState<{ success: boolean; message: string } | null>(null)
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false)
  const [pendingRestore, setPendingRestore] = useState<{ text: string; counts: { clients: number; quotes: number; payments: number; expenses: number } } | null>(null)

  // Atualizar formData quando settings mudarem
  useEffect(() => {
    setFormData(settings)
  }, [settings])

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 2MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64String = reader.result as string
      await updateLogo(base64String)
      setFormData((prev) => ({ ...prev, logo: base64String }))
      
      // Atualizar favicon e PWA dinamicamente
      updateFaviconAndPWA(base64String)
      
      // Mostrar mensagem de sucesso
      setSuccess(true)
      setTimeout(() => setSuccess(false), 5000)
    }
    reader.readAsDataURL(file)
  }

  const updateFaviconAndPWA = (logoBase64: string) => {
    // Remover favicons antigos
    const oldFavicons = document.querySelectorAll("link[rel~='icon']")
    oldFavicons.forEach(link => link.remove())
    
    const oldAppleIcons = document.querySelectorAll("link[rel~='apple-touch-icon']")
    oldAppleIcons.forEach(link => link.remove())

    // Criar novo favicon
    const link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/png'
    link.href = logoBase64
    document.getElementsByTagName('head')[0].appendChild(link)

    // Criar novo apple-touch-icon
    const appleLink = document.createElement('link')
    appleLink.rel = 'apple-touch-icon'
    appleLink.href = logoBase64
    document.getElementsByTagName('head')[0].appendChild(appleLink)

    // Forçar reload do manifest
    const manifestLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement
    if (manifestLink) {
      manifestLink.href = `/api/manifest?t=${Date.now()}`
    } else {
      const newManifestLink = document.createElement('link')
      newManifestLink.rel = 'manifest'
      newManifestLink.href = `/api/manifest?t=${Date.now()}`
      document.getElementsByTagName('head')[0].appendChild(newManifestLink)
    }

    // Atualizar título e meta tags do PWA
    if (formData.name && formData.name !== 'ServiPro') {
      document.title = `${formData.name} - Gestão de Orçamentos`
      
      const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]')
      if (appleTitle) {
        appleTitle.setAttribute('content', formData.name)
      }
    }
  }

  const handleRemoveLogo = async () => {
    await removeLogo()
    setFormData((prev) => ({ ...prev, logo: undefined }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    
    // Remover favicons customizados
    const oldFavicons = document.querySelectorAll("link[rel~='icon']")
    oldFavicons.forEach(link => link.remove())
    
    const oldAppleIcons = document.querySelectorAll("link[rel~='apple-touch-icon']")
    oldAppleIcons.forEach(link => link.remove())
    
    // Restaurar favicon padrão
    const link = document.createElement('link')
    link.rel = 'icon'
    link.href = '/icon-192x192.png'
    document.getElementsByTagName('head')[0].appendChild(link)
    
    const appleLink = document.createElement('link')
    appleLink.rel = 'apple-touch-icon'
    appleLink.href = '/apple-icon-180x180.png'
    document.getElementsByTagName('head')[0].appendChild(appleLink)
    
    // Restaurar manifest padrão
    const manifestLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement
    if (manifestLink) {
      manifestLink.href = '/manifest.json'
    }
  }

  const handleExportBackup = async () => {
    if (!user?.id) return
    setBackupLoading(true)
    setBackupError(null)
    try {
      const res = await fetch('/api/backup', {
        headers: { 'x-user-id': user.id },
      })
      const data = await res.json()
      if (!res.ok) {
        setBackupError(data.error || 'Erro ao exportar backup')
        return
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-${data.exportedAt?.slice(0, 10) || new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setBackupError(e?.message || 'Erro ao exportar backup')
    } finally {
      setBackupLoading(false)
    }
  }

  const handleRestoreFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return
    setRestoreResult(null)
    setBackupError(null)
    try {
      const text = await file.text()
      const body = JSON.parse(text)
      if (!Array.isArray(body.clients) || !Array.isArray(body.quotes)) {
        setRestoreResult({ success: false, message: 'Arquivo inválido. Use um backup exportado por este sistema.' })
        return
      }
      const clients = body.clients?.length ?? 0
      const quotes = body.quotes?.length ?? 0
      const payments = body.payments?.length ?? 0
      const expenses = body.expenses?.length ?? 0
      if (clients === 0 && quotes === 0) {
        setRestoreResult({
          success: false,
          message: 'Este backup está vazio (sem clientes e orçamentos). Restaurar apagaria todos os dados. Use um arquivo que contenha dados.',
        })
        return
      }
      setPendingRestore({ text, counts: { clients, quotes, payments, expenses } })
      setRestoreConfirmOpen(true)
    } catch (e: any) {
      setRestoreResult({ success: false, message: e?.message || 'Erro ao processar arquivo. Verifique se é um JSON válido.' })
    }
    if (restoreFileRef.current) restoreFileRef.current.value = ''
  }

  const handleRestoreConfirm = async () => {
    if (!user?.id || !pendingRestore) return
    setRestoreLoading(true)
    setRestoreResult(null)
    setRestoreConfirmOpen(false)
    try {
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: pendingRestore.text,
      })
      const data = await res.json()
      if (!res.ok) {
        setRestoreResult({ success: false, message: data.error || 'Erro ao restaurar backup' })
        return
      }
      setRestoreResult({
        success: true,
        message: `Restaurado: ${data.restored?.clients ?? 0} clientes, ${data.restored?.quotes ?? 0} orçamentos e demais dados. Recarregue a página para ver as alterações.`,
      })
    } catch (e: any) {
      setRestoreResult({ success: false, message: e?.message || 'Erro ao restaurar backup' })
    } finally {
      setRestoreLoading(false)
      setPendingRestore(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)

    try {
      // Remove logo from formData if it's the same (to avoid unnecessary updates)
      const { logo, ...otherData } = formData
      updateSettings(otherData)
      
      // Small delay to show success message
      await new Promise((resolve) => setTimeout(resolve, 500))
      
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      alert('Erro ao salvar configurações. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Configuracoes da Empresa</h1>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-accent/10 text-accent border border-accent/20">
          <CheckCircle2 className="w-5 h-5" />
          <span>Configuracoes salvas com sucesso!</span>
        </div>
      )}

      <AlertDialog open={restoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar restauração</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Este backup contém:</p>
                <ul className="list-disc list-inside text-sm">
                  {pendingRestore && (
                    <>
                      <li>{pendingRestore.counts.clients} clientes</li>
                      <li>{pendingRestore.counts.quotes} orçamentos</li>
                      <li>{pendingRestore.counts.payments} pagamentos</li>
                      <li>{pendingRestore.counts.expenses} despesas</li>
                    </>
                  )}
                </ul>
                <p className="font-medium text-destructive">
                  Restaurar substituirá TODOS os dados atuais por estes. Esta ação não pode ser desfeita.
                </p>
                <p>Tem certeza que deseja continuar?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleRestoreConfirm()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Logo Section */}
          <Card className="border-border lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Logo da Empresa</CardTitle>
              <CardDescription>
                Faça upload do logo da sua empresa. Ele aparecerá nos orçamentos, tela de login, favicon e ícones do PWA (max 2MB)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.logo ? (
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <img
                      src={formData.logo}
                      alt="Logo da empresa"
                      className="w-32 h-32 object-contain border border-border rounded-lg p-2 bg-background"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Alterar Logo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRemoveLogo}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remover Logo
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg">
                  <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Nenhum logo selecionado
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Selecionar Logo
                  </Button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </CardContent>
          </Card>

          {/* Company Info */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Informacoes da Empresa</CardTitle>
              <CardDescription>Dados que aparecerao nos orcamentos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Empresa *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ex: Minha Empresa LTDA"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="contato@empresa.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereco *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Rua, numero, bairro, cidade - UF, CEP"
                  rows={3}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Informacoes Adicionais</CardTitle>
              <CardDescription>Dados opcionais para os orcamentos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj || ''}
                  onChange={(e) => handleInputChange('cnpj', e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website || ''}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://www.empresa.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalInfo">Informacoes Adicionais</Label>
                <Textarea
                  id="additionalInfo"
                  value={formData.additionalInfo || ''}
                  onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                  placeholder="Informacoes extras que aparecerao no rodape do orcamento"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Configurações Financeiras */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Configuracoes Financeiras</CardTitle>
              <CardDescription>Configuracoes relacionadas ao fechamento de caixa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyCashPercentage">
                  Porcentagem do Caixa da Empresa (%)
                </Label>
                <Input
                  id="companyCashPercentage"
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  value={formData.companyCashPercentage ?? 10}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0
                    const clampedValue = Math.max(0, Math.min(50, value))
                    setFormData((prev) => ({ ...prev, companyCashPercentage: clampedValue }))
                  }}
                  placeholder="10"
                />
                <p className="text-xs text-muted-foreground">
                  Porcentagem do lucro líquido destinada ao caixa da empresa (0% a 50%). 
                  O restante será dividido igualmente entre os sócios.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Backup e Restauração */}
          <Card className="border-border lg:col-span-2 border-amber-500/30 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="w-5 h-5" />
                Backup e Restauração
              </CardTitle>
              <CardDescription>
                Faça backup dos seus dados regularmente. Se o banco desconectar ou você perder dados, use um arquivo de backup para restaurar clientes, orçamentos, pagamentos, despesas e configurações.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {backupError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {backupError}
                </div>
              )}
              {restoreResult && (
                <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${restoreResult.success ? 'bg-accent/10 text-accent border-accent/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {restoreResult.message}
                </div>
              )}
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-2">
                  <Label>Exportar backup</Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleExportBackup}
                    disabled={backupLoading || !user?.id}
                  >
                    {backupLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Baixar backup (JSON)
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Salve o arquivo em local seguro (nuvem, pendrive). Recomendado: fazer backup semanal.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Restaurar backup</Label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={restoreFileRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={handleRestoreFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => restoreFileRef.current?.click()}
                      disabled={restoreLoading || !user?.id}
                    >
                      {restoreLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Escolher arquivo e restaurar
                    </Button>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    Atenção: a restauração substitui os dados atuais pelos do arquivo. Use apenas arquivos exportados por este sistema.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Salvar Configuracoes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
