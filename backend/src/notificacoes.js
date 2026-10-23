// Eventos são registrados no próprio banco, inclusive quando os sensores gravam por SQL.
export function criarEstruturaNotificacoes(banco) {
  banco.exec('BEGIN');
  try {
    banco.exec(`
      CREATE TABLE IF NOT EXISTS notificacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL CHECK (tipo IN ('manutencao_entrada', 'manutencao_saida', 'sensor_limite')),
        trem_id INTEGER NOT NULL REFERENCES trens(id) ON DELETE CASCADE,
        leitura_id INTEGER UNIQUE REFERENCES leituras(id) ON DELETE CASCADE,
        prefixo TEXT NOT NULL,
        sensor_codigo TEXT,
        medicao_tipo TEXT,
        valor REAL,
        unidade TEXT,
        limite REAL,
        direcao TEXT CHECK (direcao IN ('acima', 'abaixo')),
        situacao_anterior TEXT,
        situacao_atual TEXT,
        ocorrida_em TEXT NOT NULL,
        criada_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE TABLE IF NOT EXISTS notificacoes_lidas (
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        notificacao_id INTEGER NOT NULL REFERENCES notificacoes(id) ON DELETE CASCADE,
        lida_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        PRIMARY KEY (usuario_id, notificacao_id)
      );
      CREATE INDEX IF NOT EXISTS idx_notificacoes_trem ON notificacoes(trem_id);
      CREATE INDEX IF NOT EXISTS idx_notificacoes_lidas_evento ON notificacoes_lidas(notificacao_id);

      CREATE TRIGGER IF NOT EXISTS notificar_mudanca_manutencao
      AFTER UPDATE OF situacao ON trens
      WHEN OLD.situacao IS NOT NEW.situacao
        AND (NEW.situacao = 'manutencao' OR OLD.situacao = 'manutencao')
      BEGIN
        INSERT INTO notificacoes (
          tipo, trem_id, prefixo, situacao_anterior, situacao_atual, ocorrida_em
        ) VALUES (
          CASE WHEN NEW.situacao = 'manutencao' THEN 'manutencao_entrada' ELSE 'manutencao_saida' END,
          NEW.id, NEW.prefixo, OLD.situacao, NEW.situacao, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        );
      END;
    `);

    const inserirAlerta = `
      INSERT INTO notificacoes (
        tipo, trem_id, leitura_id, prefixo, sensor_codigo, medicao_tipo,
        valor, unidade, limite, direcao, ocorrida_em
      )
      SELECT 'sensor_limite', t.id, NEW.id, t.prefixo, s.codigo, s.tipo,
        NEW.valor, s.unidade,
        CASE WHEN NEW.valor > lim.valor_maximo THEN lim.valor_maximo ELSE lim.valor_minimo END,
        CASE WHEN NEW.valor > lim.valor_maximo THEN 'acima' ELSE 'abaixo' END,
        COALESCE(strftime('%Y-%m-%dT%H:%M:%fZ', NEW.registrada_em), NEW.registrada_em)
      FROM sensores s
      JOIN trens t ON t.id = s.trem_id
      JOIN limites_trens lim ON lim.trem_id = t.id AND lim.tipo = s.tipo AND lim.unidade = s.unidade
      WHERE s.id = NEW.sensor_id
        AND (NEW.valor > lim.valor_maximo OR NEW.valor < lim.valor_minimo)
        AND NOT EXISTS (SELECT 1 FROM notificacoes WHERE leitura_id = NEW.id);
    `;

    banco.exec(`
      CREATE TRIGGER IF NOT EXISTS notificar_leitura_inserida
      AFTER INSERT ON leituras BEGIN ${inserirAlerta} END;
      CREATE TRIGGER IF NOT EXISTS notificar_leitura_alterada
      AFTER UPDATE OF valor, sensor_id ON leituras
      WHEN NEW.valor IS NOT OLD.valor OR NEW.sensor_id IS NOT OLD.sensor_id
      BEGIN ${inserirAlerta} END;
    `);
    banco.exec('COMMIT');
  } catch (error) {
    if (banco.isTransaction) banco.exec('ROLLBACK');
    throw error;
  }
}

const nomesMedicoes = {
  velocidade: 'Velocidade', temperatura: 'Temperatura', consumo: 'Consumo',
  vibracao: 'Vibração', capacidade: 'Capacidade',
};
const nomesSituacoes = { ativo: 'ativo', manutencao: 'em manutenção', inativo: 'inativo' };
const numero = valor => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(valor);

export function listarNotificacoes(banco, usuarioId) {
  const registros = banco.prepare(`
    SELECT n.*, nl.notificacao_id IS NOT NULL AS lida
    FROM notificacoes n
    LEFT JOIN notificacoes_lidas nl ON nl.notificacao_id = n.id AND nl.usuario_id = ?
    ORDER BY n.id DESC LIMIT 50
  `).all(usuarioId);
  const total = banco.prepare(`
    SELECT COUNT(*) AS quantidade FROM notificacoes n
    WHERE NOT EXISTS (
      SELECT 1 FROM notificacoes_lidas nl WHERE nl.notificacao_id = n.id AND nl.usuario_id = ?
    )
  `).get(usuarioId).quantidade;

  return {
    total_nao_lidas: total,
    ultimo_id: registros[0]?.id ?? 0,
    notificacoes: registros.map(registro => {
      const sensor = registro.tipo === 'sensor_limite';
      const entrada = registro.tipo === 'manutencao_entrada';
      return {
        id: registro.id, tipo: registro.tipo, lida: Boolean(registro.lida),
        criada_em: registro.criada_em, ocorrida_em: registro.ocorrida_em,
        titulo: sensor
          ? `${registro.prefixo} · ${registro.sensor_codigo} · ${nomesMedicoes[registro.medicao_tipo] || registro.medicao_tipo} ${registro.direcao} do limite`
          : `${registro.prefixo} ${entrada ? 'entrou em' : 'saiu da'} manutenção`,
        descricao: sensor
          ? `${numero(registro.valor)} ${registro.unidade} registrados; ${registro.direcao === 'acima' ? 'máximo' : 'mínimo'} esperado: ${numero(registro.limite)} ${registro.unidade}.`
          : `Situação alterada de ${nomesSituacoes[registro.situacao_anterior]} para ${nomesSituacoes[registro.situacao_atual]}.`,
        destino: sensor
          ? `/index/trensLeituras/relatorio/${registro.leitura_id}#medicao-${registro.leitura_id}`
          : `/index/trensGerenciamento/editar/${registro.trem_id}`,
      };
    }),
  };
}
