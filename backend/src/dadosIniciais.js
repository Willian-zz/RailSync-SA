// Dados de teste para a interface. Os limites abaixo não são parâmetros operacionais.
const tipos = [
  ["velocidade", "km/h", 0, 80],
  ["temperatura", "°C", -10, 90],
  ["consumo", "L/h", 0, 100],
  ["vibracao", "mm/s", 0, 5],
  ["capacidade", "%", 0, 100],
];

const trens = [
  { prefixo: "LOC-2001", anterior: "DEMO-001", modelo: "GE AC44i", ano: 2020, linha: "Linha Norte", inicio: 201, valores: [
    [65, 68, 72, 76, 81, 78, 0, 71],
    [72, 74, 77, 81, 84, 87, 75, 73],
    [85, 88, 90, 93, 96, 99, 42, 91],
    [2.5, 2.7, 3, 3.2, 3.6, 4, 0.8, 2.6],
    [78, 80, 83, 86, 89, 92, 75, 79],
  ] },
  { prefixo: "LOC-2002", anterior: "DEMO-002", modelo: "EMD SD70ACe", ano: 2022, linha: "Linha Sul", inicio: 206, valores: [
    [60, 70, 78, 95, 86, 82, 79, 72],
    [76, 80, 88, 105, 97, 91, 84, 78],
    [77, 85, 96, 120, 108, 99, 92, 80],
    [2.1, 2.8, 4.3, 7.2, 6.1, 5.3, 4, 2.9],
    [72, 80, 93, 110, 103, 98, 87, 78],
  ] },
  { prefixo: "LOC-2003", modelo: "GE Dash 9", ano: 2018, linha: "Linha Leste", inicio: 211, valores: [
    [52, 57, 63, 67, 72, 76, 70, 65],
    [67, 69, 73, 78, 82, 85, 80, 75],
    [62, 66, 70, 76, 82, 86, 79, 73],
    [1.5, 1.7, 2, 2.2, 2.5, 2.8, 2.4, 2],
    [54, 58, 63, 68, 73, 77, 72, 65],
  ] },
  { prefixo: "AUT-3001", modelo: "Automotriz VLI", ano: 2021, linha: "Linha Sul", inicio: 216, valores: [
    [48, 55, 62, 68, 74, 83, 77, 69],
    [63, 68, 73, 79, 86, 92, 88, 80],
    [58, 65, 73, 82, 91, 103, 97, 86],
    [1.2, 1.6, 2, 2.8, 3.9, 5.6, 4.8, 3.1],
    [46, 53, 61, 70, 79, 88, 94, 84],
  ] },
];

function renomear(banco, tabela, coluna, anterior, novo) {
  const antigo = banco.prepare(`SELECT id FROM ${tabela} WHERE ${coluna} = ?`).get(anterior);
  if (!antigo) return;
  const atual = banco.prepare(`SELECT id FROM ${tabela} WHERE ${coluna} = ?`).get(novo);
  if (atual && atual.id !== antigo.id) {
    throw new Error(`Não foi possível migrar ${anterior}: ${novo} já pertence a outro registro.`);
  }
  banco.prepare(`UPDATE ${tabela} SET ${coluna} = ? WHERE id = ?`).run(novo, antigo.id);
}

export function popularBanco(banco) {
  banco.exec("BEGIN TRANSACTION;");
  try {
    const buscarLinha = banco.prepare("SELECT id FROM linhas WHERE nome = ?");
    const inserirLinha = banco.prepare("INSERT OR IGNORE INTO linhas (nome) VALUES (?)");
    const inserirTrem = banco.prepare("INSERT OR IGNORE INTO trens (prefixo, modelo, ano, situacao, linha_id) VALUES (?, ?, ?, 'ativo', ?)");
    const buscarTrem = banco.prepare("SELECT id FROM trens WHERE prefixo = ?");
    const vincularLinha = banco.prepare("UPDATE trens SET linha_id = ? WHERE id = ? AND linha_id IS NULL");
    const inserirSensor = banco.prepare("INSERT OR IGNORE INTO sensores (codigo, tipo, unidade, trem_id) VALUES (?, ?, ?, ?)");
    const buscarSensor = banco.prepare("SELECT id, trem_id, tipo, unidade FROM sensores WHERE codigo = ?");
    const inserirLimite = banco.prepare("INSERT OR IGNORE INTO limites_trens (trem_id, tipo, unidade, valor_minimo, valor_maximo) VALUES (?, ?, ?, ?, ?)");
    const inserirLeitura = banco.prepare(`
      INSERT INTO leituras (sensor_id, valor, registrada_em)
      SELECT ?, ?, ? WHERE NOT EXISTS (
        SELECT 1 FROM leituras WHERE sensor_id = ? AND julianday(registrada_em) = julianday(?)
      )
    `);

    for (const trem of trens) {
      if (trem.anterior) renomear(banco, "trens", "prefixo", trem.anterior, trem.prefixo);
      inserirLinha.run(trem.linha);
      const linhaId = buscarLinha.get(trem.linha).id;
      inserirTrem.run(trem.prefixo, trem.modelo, trem.ano, linhaId);
      const tremId = buscarTrem.get(trem.prefixo).id;
      vincularLinha.run(linhaId, tremId);

      tipos.forEach(([tipo, unidade, minimo, maximo], indice) => {
        const codigo = `SEN-${trem.inicio + indice}`;
        if (trem.anterior) {
          const anterior = `DEMO-SEN-${String((trem.inicio - 201) + indice + 1).padStart(3, "0")}`;
          renomear(banco, "sensores", "codigo", anterior, codigo);
        }
        inserirSensor.run(codigo, tipo, unidade, tremId);
        const sensor = buscarSensor.get(codigo);
        if (sensor.trem_id !== tremId || sensor.tipo !== tipo || sensor.unidade !== unidade) {
          throw new Error(`O código ${codigo} já pertence a outro sensor.`);
        }
        inserirLimite.run(tremId, tipo, unidade, minimo, maximo);
        trem.valores[indice].forEach((valor, amostra) => {
          const horario = `2026-10-19 13:${String(amostra * 5).padStart(2, "0")}:00`;
          inserirLeitura.run(sensor.id, valor, horario, sensor.id, horario);
        });
      });
    }
    banco.exec("COMMIT;");
  } catch (error) {
    if (banco.isTransaction) banco.exec("ROLLBACK;");
    throw error;
  }
}
