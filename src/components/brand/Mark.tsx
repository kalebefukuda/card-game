import Image from 'next/image'
import marca from '../../../public/logo.png'

/**
 * A marca: a ilustracao do grupo.
 *
 * Substituiu o mascote desenhado em SVG. A arte tem contorno grosso e contraste
 * alto de proposito — e o que permite ela sobreviver aos 26px do rodape da
 * carta, onde um desenho de traco fino viraria borrao.
 *
 * Passa pelo next/image em vez de <img> para o navegador baixar a versao do
 * tamanho certo: a mesma marca aparece a 26px na carta e a 500px no inicio, e
 * servir o arquivo grande nos dois casos seria desperdicio em rede movel.
 *
 * Sobre fundo escuro ela se inverte sozinha. A arte e preta sobre branco, entao
 * numa carta preta ela sumiria — o mascote antigo era SVG e trocava de cor com
 * currentColor, o que um PNG nao faz. `filter: invert()` resolve: o branco vira
 * preto e some no fundo, o traco preto vira branco e aparece. Quem hospeda so
 * declara --mark-invert: 1.
 */
export function Mark({
  size = 32,
  className,
  priority = false,
  alt = '',
}: {
  /** Altura em pixels. A largura acompanha a proporcao da arte. */
  size?: number
  className?: string
  priority?: boolean
  alt?: string
}) {
  const proporcao = marca.width / marca.height

  return (
    <Image
      src={marca}
      alt={alt}
      width={Math.round(size * proporcao)}
      height={size}
      priority={priority}
      aria-hidden={alt ? undefined : true}
      className={className}
      style={{ filter: 'invert(var(--mark-invert, 0))' }}
    />
  )
}
