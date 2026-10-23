import { tiposLeituras } from './leituras.js';

const nomes = {
  velocidade: 'Velocidade', temperatura: 'Temperatura', consumo: 'Consumo',
  vibracao: 'Vibração', capacidade: 'Capacidade (carga)',
};

export function obterDashboard(banco, escopo = 'historico') {
  if (!['historico', 'atuais'].includes(escopo)) {
    throw Object.assign(new Error('Escolha o histórico ou as últimas leituras dos sensores.'), { status: 400 });
  }

  const trens = banco.prepare(`
    SELECT COUNT(*) AS total,
      COALESCE(SUM(situacao = 'ativo'), 0) AS ativos,
      COALESCE(SUM(situacao = 'manutencao'), 0) AS manutencao,
      COALESCE(SUM(situacao = 'inativo'), 0) AS inativos
    FROM trens
  `).get();

  // A última leitura é determinada pelo instante registrado, com o ID como desempate.
  // Não troca uma leitura recente normal por um erro antigo do mesmo sensor.
  const registros = banco.prepare(`
    WITH ordenadas AS (
      SELECT l.id, l.valor, l.registrada_em, s.tipo, s.unidade, s.trem_id,
        ROW_NUMBER() OVER (
          PARTITION BY s.id ORDER BY julianday(l.registrada_em) DESC, l.id DESC
        ) AS posicao
      FROM leituras l
      JOIN sensores s ON s.id = l.sensor_id
      WHERE s.tipo IN ('velocidade', 'temperatura', 'consumo', 'vibracao', 'capacidade')
    ), consideradas AS (
      SELECT o.*, lim.id AS limite_id, lim.valor_minimo, lim.valor_maximo
      FROM ordenadas o
      LEFT JOIN limites_trens lim
        ON lim.trem_id = o.trem_id AND lim.tipo = o.tipo AND lim.unidade = o.unidade
      WHERE ? = 'historico' OR o.posicao = 1
    ), classificadas AS (
      SELECT *, CASE
        WHEN typeof(valor) IN ('integer', 'real') AND abs(valor) <= 1.7976931348623157e308
          AND (valor < valor_minimo OR valor > valor_maximo)
        THEN 1 ELSE 0 END AS em_erro
      FROM consideradas
    )
    SELECT tipo, COUNT(*) AS quantidade_leituras,
      SUM(em_erro) AS quantidade_erros,
      SUM(limite_id IS NULL) AS sem_limite,
      (SELECT COUNT(DISTINCT trem_id) FROM classificadas WHERE em_erro = 1) AS trens_com_erro,
      (SELECT strftime('%Y-%m-%dT%H:%M:%fZ', MAX(julianday(registrada_em))) FROM classificadas) AS ultima_leitura
    FROM classificadas GROUP BY tipo
  `).all(escopo);

  const errosPorTipo = tiposLeituras.map(tipo => ({
    tipo, nome: nomes[tipo],
    quantidade: registros.find(registro => registro.tipo === tipo)?.quantidade_erros ?? 0,
  }));

  return {
    escopo,
    trens,
    erros: {
      total: errosPorTipo.reduce((total, tipo) => total + tipo.quantidade, 0),
      trens_com_erro: registros[0]?.trens_com_erro ?? 0,
      por_tipo: errosPorTipo,
      leituras_consideradas: registros.reduce((total, registro) => total + registro.quantidade_leituras, 0),
      leituras_sem_limite: registros.reduce((total, registro) => total + registro.sem_limite, 0),
    },
    ultima_leitura: registros[0]?.ultima_leitura ?? null,
    atualizado_em: new Date().toISOString(),
  };
}
