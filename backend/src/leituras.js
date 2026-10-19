export const tiposLeituras = [
  "velocidade",
  "temperatura",
  "consumo",
  "vibracao",
  "capacidade",
];

function rejeitarLimites(message) {
  const erro = new Error(message);
  erro.status = 400;
  throw erro;
}

// Limites vazios são opcionais. Zero é um limite válido.
export function validarLimites(limites) {
  if (!Array.isArray(limites)) {
    rejeitarLimites("Informe os limites em uma lista.");
  }

  const tiposEncontrados = new Set();

  return limites.map((limite) => {
    if (!limite || !tiposLeituras.includes(limite.tipo)) {
      rejeitarLimites("Tipo de limite inválido.");
    }

    if (tiposEncontrados.has(limite.tipo)) {
      rejeitarLimites("Informe apenas um limite por tipo de leitura.");
    }
    tiposEncontrados.add(limite.tipo);

    if (typeof limite.unidade !== "string" || !limite.unidade.trim()) {
      rejeitarLimites("Informe a unidade de cada limite.");
    }

    const minimo = limite.valor_minimo ?? null;
    const maximo = limite.valor_maximo ?? null;

    for (const valor of [minimo, maximo]) {
      if (valor !== null && (typeof valor !== "number" || !Number.isFinite(valor))) {
        rejeitarLimites("Os limites devem ser números válidos.");
      }
    }

    if (minimo === null && maximo === null) {
      rejeitarLimites("Informe um valor mínimo ou máximo para cada limite.");
    }
    if (minimo !== null && maximo !== null && minimo > maximo) {
      rejeitarLimites("O limite mínimo não pode ser maior que o máximo.");
    }

    return {
      tipo: limite.tipo,
      unidade: limite.unidade.trim(),
      valor_minimo: minimo,
      valor_maximo: maximo,
    };
  });
}

// Chamado dentro da mesma transação que salva o trem.
export function salvarLimites(banco, tremId, limites) {
  banco.prepare("DELETE FROM limites_trens WHERE trem_id = ?").run(tremId);
  const inserir = banco.prepare(`
    INSERT INTO limites_trens (trem_id, tipo, unidade, valor_minimo, valor_maximo)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const limite of limites) {
    inserir.run(
      tremId,
      limite.tipo,
      limite.unidade,
      limite.valor_minimo,
      limite.valor_maximo,
    );
  }
}

export function listarLeituras(banco, { pesquisa = "", erro = "", tremId = null, registradaEm = null } = {}) {
  const registros = banco.prepare(`
    SELECT l.id, l.valor,
           COALESCE(strftime('%Y-%m-%dT%H:%M:%fZ', l.registrada_em), l.registrada_em) AS registrada_em,
           t.id AS trem_id, t.prefixo,
           s.id AS sensor_id, s.codigo AS sensor_codigo, s.tipo, s.unidade,
           lim.id AS limite_id, lim.valor_minimo, lim.valor_maximo
    FROM leituras l
    JOIN sensores s ON s.id = l.sensor_id
    JOIN trens t ON t.id = s.trem_id
    LEFT JOIN limites_trens lim
      ON lim.trem_id = t.id AND lim.tipo = s.tipo AND lim.unidade = s.unidade
    WHERE s.tipo IN ('velocidade', 'temperatura', 'consumo', 'vibracao', 'capacidade')
      AND instr(lower(t.prefixo), lower(?)) > 0
      AND (? IS NULL OR t.id = ?)
      AND (? IS NULL OR julianday(l.registrada_em) = julianday(?))
    ORDER BY julianday(l.registrada_em) DESC, l.id DESC
  `).all(pesquisa, tremId, tremId, registradaEm, registradaEm);

  const grupos = new Map();

  for (const registro of registros) {
    const chave = `${registro.trem_id}:${registro.registrada_em}`;
    if (!grupos.has(chave)) {
      grupos.set(chave, {
        id: chave,
        leitura_id: registro.id,
        trem_id: registro.trem_id,
        prefixo: registro.prefixo,
        registrada_em: registro.registrada_em,
        medicoes: Object.fromEntries(tiposLeituras.map((tipo) => [tipo, []])),
        alertas: [],
        sem_limite: false,
      });
    }

    const grupo = grupos.get(chave);
    const valorValido = typeof registro.valor === "number" && Number.isFinite(registro.valor);
    const abaixo = valorValido && registro.valor_minimo !== null && registro.valor < registro.valor_minimo;
    const acima = valorValido && registro.valor_maximo !== null && registro.valor > registro.valor_maximo;
    const emErro = abaixo || acima;

    grupo.medicoes[registro.tipo].push({
      id: registro.id,
      sensor_id: registro.sensor_id,
      valor: valorValido ? registro.valor : null,
      unidade: registro.unidade,
      sensor_codigo: registro.sensor_codigo,
      em_erro: emErro,
      limite_minimo: registro.valor_minimo,
      limite_maximo: registro.valor_maximo,
      limite_configurado: registro.limite_id !== null,
    });

    if (registro.limite_id === null) grupo.sem_limite = true;

    if (emErro) {
      grupo.alertas.push({
        leitura_id: registro.id,
        tipo: registro.tipo,
        sensor_codigo: registro.sensor_codigo,
        direcao: abaixo ? "abaixo" : "acima",
        limite: abaixo ? registro.valor_minimo : registro.valor_maximo,
        unidade: registro.unidade,
      });
    }
  }

  return [...grupos.values()]
    .map((grupo) => ({ ...grupo, em_erro: grupo.alertas.length > 0 }))
    .filter((grupo) => !erro || (
      erro === "todos"
        ? grupo.em_erro
        : grupo.alertas.some((alerta) => alerta.tipo === erro)
    ));
}

export function obterRelatorio(banco, leituraId) {
  const origem = banco.prepare(`
    SELECT l.registrada_em, t.id, t.prefixo, t.modelo, t.situacao
    FROM leituras l
    JOIN sensores s ON s.id = l.sensor_id
    JOIN trens t ON t.id = s.trem_id
    WHERE l.id = ?
  `).get(leituraId);
  if (!origem) return null;

  const leitura = listarLeituras(banco, {
    tremId: origem.id,
    registradaEm: origem.registrada_em,
  })[0];
  if (!leitura) return null;

  const medicoes = tiposLeituras.flatMap((tipo) =>
    leitura.medicoes[tipo].map((medicao) => {
      const alerta = leitura.alertas.find((item) => item.leitura_id === medicao.id);
      return {
        ...medicao,
        tipo,
        direcao: alerta?.direcao ?? null,
        diferenca: medicao.valor === null || !medicao.limite_configurado
          ? null
          : alerta ? Math.abs(medicao.valor - alerta.limite) : 0,
      };
    }),
  );

  // Somente registros persistidos: sem preenchimento, interpolação ou amostras geradas.
  const registros = banco.prepare(`
    SELECT s.id AS sensor_id, s.codigo, s.tipo, s.unidade,
           lim.valor_minimo, lim.valor_maximo,
           l.id AS leitura_id, l.valor,
           strftime('%Y-%m-%dT%H:%M:%fZ', l.registrada_em) AS registrada_em
    FROM sensores s
    LEFT JOIN leituras l ON l.sensor_id = s.id
    LEFT JOIN limites_trens lim
      ON lim.trem_id = s.trem_id AND lim.tipo = s.tipo AND lim.unidade = s.unidade
    WHERE s.trem_id = ?
    ORDER BY s.codigo COLLATE NOCASE, julianday(l.registrada_em), l.id
  `).all(origem.id);
  const sensores = new Map();
  for (const registro of registros) {
    if (!sensores.has(registro.sensor_id)) {
      sensores.set(registro.sensor_id, {
        id: registro.sensor_id,
        codigo: registro.codigo,
        tipo: registro.tipo,
        unidade: registro.unidade,
        limite_minimo: registro.valor_minimo,
        limite_maximo: registro.valor_maximo,
        pontos: [],
      });
    }
    if (registro.leitura_id !== null && registro.registrada_em !== null &&
        typeof registro.valor === "number" && Number.isFinite(registro.valor)) {
      sensores.get(registro.sensor_id).pontos.push({
        id: registro.leitura_id,
        valor: registro.valor,
        registrada_em: registro.registrada_em,
      });
    }
  }

  return {
    leitura: { ...leitura, leitura_id: leituraId },
    trem: { id: origem.id, prefixo: origem.prefixo, modelo: origem.modelo, situacao: origem.situacao },
    medicoes,
    sensores: [...sensores.values()],
    gerado_em: new Date().toISOString(),
  };
}
