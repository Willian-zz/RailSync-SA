import { normalizarBusca } from '@/lib/busca';

export function pesquisarLinha(linha, termo) {
  const texto = [
    linha.nome, linha.rota?.nome, linha.rota?.origem, linha.rota?.destino,
    ...linha.trens.map(trem => trem.prefixo),
  ].join(' ');

  return normalizarBusca(texto).includes(normalizarBusca(termo));
}
