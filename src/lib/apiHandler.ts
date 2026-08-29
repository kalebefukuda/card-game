import { NextResponse } from 'next/server'
import { GameError } from '@/lib/game'

/** Converte GameError em resposta HTTP e evita vazar erro interno pro cliente. */
export async function handle<T>(fn: () => Promise<T>) {
  try {
    return NextResponse.json((await fn()) ?? { ok: true })
  } catch (error) {
    if (error instanceof GameError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[api]', error)
    return NextResponse.json({ error: 'Erro inesperado no servidor' }, { status: 500 })
  }
}

export type RouteContext = { params: Promise<{ code: string }> }
