import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { obterDashboard } from '../src/dashboard.js';
import { listarLeituras } from '../src/leituras.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'dashboard-teste-local';
const pasta = mkdtempSync(join(tmpdir(), 'railsync-dashboard-'));
process.env.DATABASE_PATH = join(pasta, 'banco.db');
const { default: banco } = await import('../src/banco.js');
const { default: dashboard } = await import('../routes/dashboardRoutes.js');
const app = express();
app.use(cookieParser());
app.use('/dashboard', dashboard);
const servidor = app.listen(0, '127.0.0.1');
await new Promise(resolve => servidor.once('listening', resolve));
const base = `http://127.0.0.1:${servidor.address().port}/dashboard`;
const contas = {};
for (const cargo of ['usuario', 'operario', 'dev']) {
  const id = Number(banco.prepare('INSERT INTO usuarios(fullname,email,senha_hash,cargo) VALUES(?,?,?,?)').run(cargo, `${cargo}@teste.local`, 'hash', cargo).lastInsertRowid);
  contas[cargo] = { id, token: jwt.sign({ id, cargo: 'dev' }, process.env.JWT_SECRET) };
}
let sequencia = 0;

function trem(situacao = 'ativo') {
  return Number(banco.prepare("INSERT INTO trens(prefixo,modelo,ano,situacao) VALUES(?,'Modelo teste',2020,?)").run(`DASH-${++sequencia}`, situacao).lastInsertRowid);
}
function sensor(tremId, tipo = 'velocidade', unidade = 'km/h', minimo = 0, maximo = 80) {
  const id = Number(banco.prepare('INSERT INTO sensores(codigo,tipo,unidade,trem_id) VALUES(?,?,?,?)').run(`SEN-${++sequencia}`, tipo, unidade, tremId).lastInsertRowid);
  banco.prepare('INSERT OR IGNORE INTO limites_trens(trem_id,tipo,unidade,valor_minimo,valor_maximo) VALUES(?,?,?,?,?)').run(tremId, tipo, unidade, minimo, maximo);
  return id;
}
function leitura(sensorId, valor, data = '2026-10-23T12:00:00Z') {
  return Number(banco.prepare('INSERT INTO leituras(sensor_id,valor,registrada_em) VALUES(?,?,?)').run(sensorId, valor, data).lastInsertRowid);
}
async function chamar(query = '', cargo = 'operario') {
  const resposta = await fetch(base + query, { headers: cargo ? { Cookie: `token=${contas[cargo].token}` } : {} });
  return { status: resposta.status, cache: resposta.headers.get('cache-control'), dados: await resposta.json() };
}
beforeEach(() => banco.exec('DELETE FROM trens'));
after(async () => {
  await new Promise(resolve => servidor.close(resolve));
  banco.close();
  rmSync(pasta, { recursive: true, force: true });
});

test('banco sem trens ou leituras retorna zeros reais e as cinco categorias da legenda', () => {
  const resumo = obterDashboard(banco);
  assert.deepEqual({ ...resumo.trens }, { total: 0, ativos: 0, manutencao: 0, inativos: 0 });
  assert.equal(resumo.erros.total, 0);
  assert.equal(resumo.erros.trens_com_erro, 0);
  assert.equal(resumo.erros.leituras_consideradas, 0);
  assert.equal(resumo.ultima_leitura, null);
  assert.equal(resumo.erros.por_tipo.length, 5);
  assert.ok(resumo.erros.por_tipo.every(tipo => tipo.quantidade === 0));
});

test('contagem da frota usa os estados cadastrados e acompanha mudanças sem depender de linhas ou horários', () => {
  trem(); trem(); const id = trem('manutencao'); trem('inativo');
  assert.deepEqual({ ...obterDashboard(banco).trens }, { total: 4, ativos: 2, manutencao: 1, inativos: 1 });
  banco.prepare("UPDATE trens SET situacao='ativo' WHERE id=?").run(id);
  assert.deepEqual({ ...obterDashboard(banco).trens }, { total: 4, ativos: 3, manutencao: 0, inativos: 1 });
});

test('histórico soma erros por medição, distingue trens e coincide com os alertas dos relatórios existentes', () => {
  const a = trem(), b = trem('manutencao');
  const velocidadeA = sensor(a);
  leitura(velocidadeA, 85); leitura(velocidadeA, 90); leitura(velocidadeA, 80);
  leitura(sensor(a, 'temperatura', '°C', -10, 90), 101);
  leitura(sensor(a, 'capacidade', '%', 0, 100), 110);
  leitura(sensor(a, 'consumo', 'L/h', 0, 100), 0);
  leitura(sensor(a, 'vibracao', 'mm/s', 0, 5), -1);
  leitura(sensor(b), 100);
  const historico = obterDashboard(banco, 'historico');
  assert.deepEqual(historico.erros.por_tipo.map(tipo => tipo.quantidade), [3, 1, 0, 1, 1]);
  assert.equal(historico.erros.total, 6);
  assert.equal(historico.erros.trens_com_erro, 2);
  assert.equal(historico.erros.leituras_consideradas, 8);
  assert.equal(listarLeituras(banco).reduce((total, grupo) => total + grupo.alertas.length, 0), historico.erros.total);
  const atuais = obterDashboard(banco, 'atuais');
  assert.equal(atuais.erros.total, 4);
  assert.equal(atuais.erros.leituras_consideradas, 6);
  assert.equal(atuais.erros.trens_com_erro, 2);
  assert.equal(atuais.erros.por_tipo[0].quantidade, 1);
  assert.deepEqual(atuais.trens, historico.trens);
});

test('mínimo e máximo são inclusivos, unidades distintas e falta de limite não geram erros', () => {
  const a = trem(), b = trem();
  const velocidade = sensor(a);
  leitura(velocidade, 0); leitura(velocidade, 80);
  leitura(sensor(a, 'temperatura', '°C', null, 90), 90);
  leitura(sensor(a, 'vibracao', 'mm/s', 0, null), 0);
  const diferente = Number(banco.prepare("INSERT INTO sensores(codigo,tipo,unidade,trem_id) VALUES('UNIDADE-DIFERENTE','velocidade','m/s',?)").run(a).lastInsertRowid);
  leitura(diferente, 999);
  const semLimite = sensor(b);
  banco.prepare('DELETE FROM limites_trens WHERE trem_id=?').run(b);
  leitura(semLimite, 999);
  const resumo = obterDashboard(banco);
  assert.equal(resumo.erros.total, 0);
  assert.equal(resumo.erros.leituras_sem_limite, 2);
  assert.equal(resumo.erros.leituras_consideradas, 6);
});

test('última leitura usa o instante e desempata pelo ID; inserção atrasada não reabre erro antigo', () => {
  const id = sensor(trem());
  leitura(id, 95, '2026-10-23T10:00:00-03:00');
  leitura(id, 60, '2026-10-23T15:00:00+02:00');
  leitura(id, 100, '2026-10-23T12:00:00Z');
  assert.equal(obterDashboard(banco, 'atuais').erros.total, 0);
  assert.equal(obterDashboard(banco, 'historico').erros.total, 2);
  assert.equal(obterDashboard(banco, 'atuais').ultima_leitura, '2026-10-23T13:00:00.000Z');
  leitura(id, 120, '2026-10-23T13:00:00Z');
  assert.equal(obterDashboard(banco, 'atuais').erros.total, 1);
});

test('alterar limites recalcula números; consulta e notificações lidas não alteram as contagens', () => {
  const tremId = trem();
  leitura(sensor(tremId), 95);
  const antes = banco.prepare('SELECT COUNT(*) AS n FROM notificacoes').get().n;
  assert.equal(obterDashboard(banco).erros.total, 1);
  banco.prepare('INSERT INTO notificacoes_lidas(usuario_id,notificacao_id) SELECT ?,id FROM notificacoes').run(contas.operario.id);
  assert.equal(obterDashboard(banco).erros.total, 1);
  assert.equal(banco.prepare('SELECT COUNT(*) AS n FROM notificacoes').get().n, antes);
  banco.prepare('UPDATE limites_trens SET valor_maximo=100 WHERE trem_id=?').run(tremId);
  assert.equal(obterDashboard(banco).erros.total, 0);
  assert.equal(obterDashboard(banco, 'atuais').erros.total, 0);
});

test('API é exclusiva de operários e devs, consulta o cargo atual e valida o escopo', async () => {
  assert.equal((await chamar('', null)).status, 401);
  assert.equal((await chamar('', 'usuario')).status, 403);
  for (const cargo of ['operario', 'dev']) {
    const resposta = await chamar('', cargo);
    assert.equal(resposta.status, 200);
    assert.equal(resposta.dados.escopo, 'historico');
    assert.equal(resposta.cache, 'no-store');
    assert.equal((await chamar('?escopo=atuais', cargo)).status, 200);
  }
  for (const query of ['?escopo=invalido', '?escopo=atuais&escopo=historico', '?escopo=']) {
    assert.equal((await chamar(query)).status, 400);
  }
  banco.prepare("UPDATE usuarios SET cargo='usuario' WHERE id=?").run(contas.operario.id);
  assert.equal((await chamar()).status, 403);
  banco.prepare("UPDATE usuarios SET cargo='operario' WHERE id=?").run(contas.operario.id);
});
