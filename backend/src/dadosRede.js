export function popularRede(banco) {
  if (banco.prepare("SELECT 1 FROM migracoes_dados WHERE nome = 'rede-v1'").get()) return;
  banco.exec('BEGIN');
  try {
    const amostras = [
      ['Eixo Norte', 'Estação Central', 'Terminal Norte', 'Linha Norte', 'ativo'],
      ['Eixo Sul', 'Estação Central', 'Terminal Sul', 'Linha Sul', 'ativo'],
      ['Eixo Leste', 'Estação Central', 'Terminal Leste', 'Linha Leste', 'manutencao'],
    ];
    for (const [nome, origem, destino, linhaNome, situacao] of amostras) {
      banco.prepare('INSERT OR IGNORE INTO rotas (nome, origem, destino, situacao) VALUES (?, ?, ?, ?)').run(nome, origem, destino, situacao);
      const rota = banco.prepare('SELECT id FROM rotas WHERE nome = ?').get(nome);
      const linha = banco.prepare('SELECT id, rota_id FROM linhas WHERE nome = ?').get(linhaNome);
      if (!linha || linha.rota_id !== null) continue;
      banco.prepare('UPDATE linhas SET rota_id = ? WHERE id = ?').run(rota.id, linha.id);
      const trens = banco.prepare("SELECT id FROM trens WHERE linha_id = ? AND prefixo IN ('LOC-2001','LOC-2002','LOC-2003','AUT-3001') ORDER BY prefixo").all(linha.id);
      trens.forEach((trem, indice) => {
        for (const hora of ['06', '08', '10', '12', '14', '16', '18', '20', '22']) {
          banco.prepare('INSERT OR IGNORE INTO horarios_linhas (linha_id, trem_id, horario) VALUES (?, ?, ?)').run(linha.id, trem.id, `${hora}:${indice ? '30' : '00'}`);
        }
      });
    }
    banco.prepare("INSERT INTO migracoes_dados (nome) VALUES ('rede-v1')").run();
    banco.exec('COMMIT');
  } catch (error) { if (banco.isTransaction) banco.exec('ROLLBACK'); throw error; }
}
