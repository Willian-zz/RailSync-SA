export const FUSO_REDE = 'America/Sao_Paulo';
const estados = ['ativo', 'manutencao', 'inativo'];
const calendario = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO_REDE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

function situacaoLinha(linha, trens) {
  if (linha.situacao !== 'ativo') return linha.situacao;
  if (trens.some(t => t.situacao === 'ativo')) return 'ativo';
  return trens.some(t => t.situacao === 'manutencao') ? 'manutencao' : 'inativo';
}
export function proximaSaida(horarios, agora = new Date()) {
  const p = Object.fromEntries(calendario.formatToParts(agora).map(v => [v.type, v.value]));
  const dia = `${p.year}-${p.month}-${p.day}`;
  const hora = `${p.hour}:${p.minute}`;
  const amanha = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) + 1)).toISOString().slice(0, 10);
  const candidatos = horarios.map(h => ({ ...h, data: h.horario >= hora ? dia : amanha, amanha: h.horario < hora }));
  return candidatos.sort((a, b) => `${a.data}T${a.horario}`.localeCompare(`${b.data}T${b.horario}`) || a.trem_id - b.trem_id)[0] ?? null;
}

export function consultarRede(banco, agora = new Date()) {
  const rotas = banco.prepare('SELECT * FROM rotas ORDER BY nome COLLATE NOCASE').all();
  const linhas = banco.prepare('SELECT * FROM linhas ORDER BY nome COLLATE NOCASE').all();
  const trens = banco.prepare('SELECT id, prefixo, modelo, situacao, linha_id FROM trens ORDER BY prefixo COLLATE NOCASE').all();
  const horarios = banco.prepare(`SELECT h.*, t.prefixo, t.situacao AS trem_situacao, l.nome AS linha_nome
    FROM horarios_linhas h JOIN trens t ON t.id = h.trem_id JOIN linhas l ON l.id = h.linha_id ORDER BY h.horario, t.prefixo`).all();
  const bases = linhas.map(l => {
    const atribuidos = trens.filter(t => t.linha_id === l.id);
    return { ...l, situacao_cadastro: l.situacao, situacao: situacaoLinha(l, atribuidos), trens: atribuidos,
      horarios: horarios.filter(h => h.linha_id === l.id) };
  });
  const saidasRotas = rotas.map(r => {
    const filhas = bases.filter(l => l.rota_id === r.id);
    const situacao = r.situacao !== 'ativo' ? r.situacao : filhas.some(l => l.situacao === 'ativo') ? 'ativo'
      : filhas.some(l => l.situacao === 'manutencao') ? 'manutencao' : 'inativo';
    return { ...r, situacao_cadastro: r.situacao, situacao, linhas: filhas };
  });
  const saidasLinhas = bases.map(l => {
    const rota = saidasRotas.find(r => r.id === l.rota_id);
    const situacao = !rota ? 'inativo' : rota.situacao_cadastro !== 'ativo' ? rota.situacao_cadastro : l.situacao;
    const operacionais = situacao === 'ativo' ? l.horarios.filter(h => h.trem_situacao === 'ativo') : [];
    return { ...l, situacao, rota: rota ? { id: rota.id, nome: rota.nome, origem: rota.origem, destino: rota.destino, situacao: rota.situacao } : null,
      proxima_saida: proximaSaida(operacionais, agora) };
  });
  return { fuso: FUSO_REDE, atualizado_em: agora.toISOString(), linhas: saidasLinhas,
    rotas: saidasRotas.map(r => {
      const filhas = saidasLinhas.filter(l => l.rota_id === r.id);
      return { ...r, linhas: filhas, proxima_saida: proximaSaida(filhas.flatMap(l => l.situacao === 'ativo' ? l.horarios.filter(h => h.trem_situacao === 'ativo') : []), agora) };
    }) };
}

function falhar(message, status = 400) { throw Object.assign(new Error(message), { status }); }
export function idValido(valor) {
  const id = Number(valor);
  if (!Number.isSafeInteger(id) || id <= 0) falhar('Identificador inválido.');
  return id;
}
function texto(valor, nome) {
  if (typeof valor !== 'string' || !valor.trim() || valor.trim().length > 150) falhar(`Informe ${nome} com até 150 caracteres.`);
  return valor.trim();
}
function ids(lista, nome) {
  if (!Array.isArray(lista)) falhar(`Informe a lista de ${nome}.`);
  const resultado = lista.map(idValido);
  if (new Set(resultado).size !== resultado.length) falhar(`Há ${nome} repetidos.`);
  return resultado;
}
export function validarCadastro(banco, tipo, dados) {
  if (!dados || !estados.includes(dados.situacao)) falhar('Situação inválida.');
  const comum = { nome: texto(dados.nome, 'o nome'), situacao: dados.situacao };
  if (tipo === 'rotas') {
    const linha_ids = ids(dados.linha_ids, 'linhas');
    for (const id of linha_ids) if (!banco.prepare('SELECT id FROM linhas WHERE id = ?').get(id)) falhar('Linha não encontrada.');
    return { ...comum, origem: texto(dados.origem, 'a origem'), destino: texto(dados.destino, 'o destino'), linha_ids };
  }
  const rota_id = dados.rota_id === null || dados.rota_id === '' ? null : idValido(dados.rota_id);
  if (rota_id && !banco.prepare('SELECT id FROM rotas WHERE id = ?').get(rota_id)) falhar('Rota não encontrada.');
  const trem_ids = ids(dados.trem_ids, 'trens');
  for (const id of trem_ids) if (!banco.prepare('SELECT id FROM trens WHERE id = ?').get(id)) falhar('Trem não encontrado.');
  if (!Array.isArray(dados.horarios)) falhar('Informe os horários da linha.');
  const horarios = dados.horarios.map(h => {
    if (!h || typeof h.horario !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(h.horario)) falhar('Horário inválido. Use HH:MM.');
    const trem_id = idValido(h.trem_id);
    if (!trem_ids.includes(trem_id)) falhar('Todo horário precisa de um trem atribuído à linha.');
    return { trem_id, horario: h.horario };
  });
  const chaves = horarios.map(h => `${h.trem_id}:${h.horario}`);
  if (new Set(chaves).size !== chaves.length) falhar('Há horários repetidos para o mesmo trem.');
  return { ...comum, rota_id, trem_ids, horarios };
}
export function salvarCadastro(banco, tipo, dados, id = null) {
  const d = validarCadastro(banco, tipo, dados);
  if (id && !banco.prepare(`SELECT id FROM ${tipo} WHERE id = ?`).get(id)) falhar('Registro não encontrado.', 404);
  if (banco.prepare(`SELECT id FROM ${tipo} WHERE nome = ? AND id != ?`).get(d.nome, id ?? 0)) falhar('Este nome já está cadastrado.', 409);
  banco.exec('BEGIN');
  try {
    if (tipo === 'rotas') {
      if (id) banco.prepare('UPDATE rotas SET nome = ?, origem = ?, destino = ?, situacao = ? WHERE id = ?').run(d.nome, d.origem, d.destino, d.situacao, id);
      else id = Number(banco.prepare('INSERT INTO rotas (nome, origem, destino, situacao) VALUES (?, ?, ?, ?)').run(d.nome, d.origem, d.destino, d.situacao).lastInsertRowid);
      banco.prepare('UPDATE linhas SET rota_id = NULL WHERE rota_id = ?').run(id);
      for (const linhaId of d.linha_ids) banco.prepare('UPDATE linhas SET rota_id = ? WHERE id = ?').run(id, linhaId);
    } else {
      if (id) banco.prepare('UPDATE linhas SET nome = ?, rota_id = ?, situacao = ? WHERE id = ?').run(d.nome, d.rota_id, d.situacao, id);
      else id = Number(banco.prepare('INSERT INTO linhas (nome, rota_id, situacao) VALUES (?, ?, ?)').run(d.nome, d.rota_id, d.situacao).lastInsertRowid);
      // Desvincular e transferir remove os horários antigos pelo gatilho do banco.
      const manter = new Set(d.trem_ids);
      for (const t of banco.prepare('SELECT id FROM trens WHERE linha_id = ?').all(id)) {
        if (!manter.has(t.id)) banco.prepare('UPDATE trens SET linha_id = NULL WHERE id = ?').run(t.id);
      }
      for (const tremId of d.trem_ids) banco.prepare('UPDATE trens SET linha_id = ? WHERE id = ?').run(id, tremId);
      banco.prepare('DELETE FROM horarios_linhas WHERE linha_id = ?').run(id);
      const inserir = banco.prepare('INSERT INTO horarios_linhas (linha_id, trem_id, horario) VALUES (?, ?, ?)');
      for (const h of d.horarios) inserir.run(id, h.trem_id, h.horario);
    }
    banco.exec('COMMIT');
    return id;
  } catch (error) { if (banco.isTransaction) banco.exec('ROLLBACK'); throw error; }
}
