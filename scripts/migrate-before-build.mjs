#!/usr/bin/env node
/**
 * Aplica as migrations pendentes antes do build.
 *
 * Existe por causa de uma quebra real em producao: o deploy publicou codigo que
 * lia quatro colunas novas enquanto o banco ainda nao as tinha, e toda criacao
 * de sala respondeu 500 ate alguem rodar a migration na mao. Com isto no build,
 * o banco sobe junto com o codigo e essa janela deixa de existir.
 *
 * O `if` de ambiente nao e cerimonia. As variaveis da Vercel valem tambem para
 * Preview, entao sem essa guarda qualquer branch com migration nova aplicaria a
 * mudanca no banco de PRODUCAO antes de virar merge — um deploy de teste
 * mexendo no banco de verdade.
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

/*
 * Na Vercel as variaveis chegam pelo ambiente; localmente elas vivem no .env,
 * que o Prisma le sozinho mas o Node nao. Sem carregar o arquivo aqui, a
 * checagem abaixo pularia sempre em maquina de desenvolvimento — que foi
 * exatamente o que aconteceu na primeira versao deste script.
 */
// loadEnvFile so existe a partir do Node 20.12. Num runtime mais antigo
// seguimos com o que ja estiver no ambiente, em vez de derrubar o build.
if (typeof process.loadEnvFile === 'function') {
  for (const file of ['.env', '.env.local']) {
    if (!existsSync(file)) continue
    try {
      process.loadEnvFile(file)
    } catch {
      // Arquivo malformado nao deve derrubar o build: a checagem abaixo decide.
    }
  }
}

const env = process.env.VERCEL_ENV

if (env && env !== 'production') {
  console.log(
    `[migrate] ambiente "${env}" — pulando. Migration so roda em production, ` +
      'para deploy de preview nao mexer no banco de verdade.'
  )
  process.exit(0)
}

if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) {
  console.log(
    '[migrate] sem DIRECT_URL nem DATABASE_URL — pulando. Permite buildar ' +
      'sem banco por perto (checagem de tipos, CI de lint).'
  )
  process.exit(0)
}

console.log('[migrate] aplicando migrations pendentes…')
const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

// Falhar aqui derruba o build de proposito: e melhor nao publicar do que
// publicar codigo que o banco nao aguenta.
if (result.status !== 0) {
  console.error('[migrate] falhou — build interrompido antes de publicar.')
  process.exit(result.status ?? 1)
}
