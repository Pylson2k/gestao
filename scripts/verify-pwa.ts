// Script para verificar se o PWA está configurado corretamente
import { existsSync } from 'fs'
import { join } from 'path'

const publicDir = join(process.cwd(), 'public')

const requiredIcons = [
  'icon-192x192.png',
  'icon-256x256.png',
  'icon-384x384.png',
  'icon-512x512.png',
  'apple-icon-180x180.png',
]

const requiredFiles = [
  'manifest.json',
  'sw.js',
]

console.log('🔍 Verificando configuração do PWA...\n')

// Verificar ícones
console.log('📱 Verificando ícones:')
let iconsOk = true
requiredIcons.forEach((icon) => {
  const path = join(publicDir, icon)
  const exists = existsSync(path)
  console.log(`  ${exists ? '✅' : '❌'} ${icon}`)
  if (!exists) iconsOk = false
})

// Verificar arquivos
console.log('\n📄 Verificando arquivos:')
let filesOk = true
requiredFiles.forEach((file) => {
  const path = join(publicDir, file)
  const exists = existsSync(path)
  console.log(`  ${exists ? '✅' : '❌'} ${file}`)
  if (!exists) filesOk = false
})

// Resultado final
console.log('\n' + '='.repeat(50))
if (iconsOk && filesOk) {
  console.log('✅ PWA está configurado corretamente!')
  console.log('\n📱 Próximos passos:')
  console.log('  1. Faça o build: npm run build')
  console.log('  2. Inicie o servidor: npm start')
  console.log('  3. Acesse no celular e instale o PWA')
} else {
  console.log('❌ Alguns arquivos estão faltando!')
  console.log('\n📝 Verifique:')
  if (!iconsOk) {
    console.log('  - Adicione os ícones faltantes na pasta public/')
  }
  if (!filesOk) {
    console.log('  - Verifique se manifest.json e sw.js existem')
  }
}
console.log('='.repeat(50))
