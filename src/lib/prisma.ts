import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Logar toda query em producao enche o log da Vercel e custa latencia:
    // em prod so o que for erro de verdade.
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error'],
  })

// Em dev o hot reload recria o modulo a cada save; sem o cache global isso abre
// uma conexao nova a cada vez e estoura o limite do Postgres.
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
