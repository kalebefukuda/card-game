/**
 * URL publica de um som no bucket "sounds" do Supabase Storage.
 *
 * O bucket e publico de proposito: som de carta nao e dado sensivel, e URL
 * publica evita ter que assinar cada arquivo a cada rodada. Quem monta a URL e
 * o servidor, nunca a interface — assim trocar de provedor de storage nao
 * espalha mudanca por componente nenhum.
 */
const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

export function soundUrl(path: string) {
  if (!BASE) return ''
  // encodeURI e nao encodeURIComponent: o caminho pode ter pastas.
  return `${BASE}/storage/v1/object/public/sounds/${encodeURI(path)}`
}
