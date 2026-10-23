import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { criarEstruturaNotificacoes } from '../src/notificacoes.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'notificacoes-usuarios-teste';
const pasta = mkdtempSync(join(tmpdir(), 'railsync-alertas-'));
process.env.DATABASE_PATH = join(pasta, 'banco.db');
const { default: banco } = await import('../src/banco.js');
const { default: notificacoes } = await import('../routes/notificacoesRoutes.js');
const { default: usuarios } = await import('../routes/usuariosRoutes.js');
const { default: stmt } = await import('../routes/stmtRoutes.js');
const app = express();
app.use(express.json(), cookieParser());
app.use('/notificacoes', notificacoes);
app.use('/usuarios', usuarios);
app.use('/stmt', stmt);
const servidor = app.listen(0, '127.0.0.1');
await new Promise(resolve => servidor.once('listening', resolve));
const base = `http://127.0.0.1:${servidor.address().port}`;
const contas = {};
let sequencia = 0;

function conta(cargo) {
  const numero = ++sequencia;
  const id = Number(banco.prepare('INSERT INTO usuarios(fullname,email,senha_hash,cargo) VALUES(?,?,?,?)').run(`Conta ${numero}`, `conta${numero}@teste.local`, 'hash-preservado', cargo).lastInsertRowid);
  // A alegação de dev no token não pode substituir a verificação do banco.
  return { id, token: jwt.sign({ id, cargo: 'dev' }, process.env.JWT_SECRET) };
}
for (const cargo of ['usuario', 'operario', 'dev']) contas[cargo] = conta(cargo);

async function chamar(path, method = 'GET', body, sessao = contas.operario) {
  const resposta = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', ...(sessao ? { Cookie: `token=${sessao.token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: resposta.status, dados: await resposta.json() };
}

function tremComSensor(unidade = 'km/h') {
  const codigo = ++sequencia;
  const tremId = Number(banco.prepare("INSERT INTO trens(prefixo,modelo,ano,situacao) VALUES(?,'Modelo teste',2020,'ativo')").run(`ALERTA-${codigo}`).lastInsertRowid);
  const sensorId = Number(banco.prepare("INSERT INTO sensores(codigo,tipo,unidade,trem_id) VALUES(?,'velocidade',?,?)").run(`SEN-${codigo}`, unidade, tremId).lastInsertRowid);
  banco.prepare("INSERT INTO limites_trens(trem_id,tipo,unidade,valor_minimo,valor_maximo) VALUES(?,'velocidade','km/h',0,80)").run(tremId);
  return { tremId, sensorId };
}

function leitura(sensorId, valor) {
  return Number(banco.prepare('INSERT INTO leituras(sensor_id,valor) VALUES(?,?)').run(sensorId, valor).lastInsertRowid);
}

beforeEach(() => banco.exec('DELETE FROM notificacoes'));
after(async () => {
  await new Promise(resolve => servidor.close(resolve));
  banco.close();
  rmSync(pasta, { recursive: true, force: true });
});

test('migração de notificações é idempotente e não inventa eventos de leituras antigas', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE usuarios(id INTEGER PRIMARY KEY);
    CREATE TABLE trens(id INTEGER PRIMARY KEY,prefixo TEXT,situacao TEXT);
    CREATE TABLE sensores(id INTEGER PRIMARY KEY,codigo TEXT,tipo TEXT,unidade TEXT,trem_id INTEGER);
    CREATE TABLE leituras(id INTEGER PRIMARY KEY,sensor_id INTEGER,valor REAL,registrada_em TEXT);
    CREATE TABLE limites_trens(id INTEGER PRIMARY KEY,trem_id INTEGER,tipo TEXT,unidade TEXT,valor_minimo REAL,valor_maximo REAL);
    INSERT INTO trens VALUES(1,'LOC-ANTIGO','ativo');
    INSERT INTO sensores VALUES(1,'SEN-ANTIGO','velocidade','km/h',1);
    INSERT INTO limites_trens VALUES(1,1,'velocidade','km/h',0,80);
    INSERT INTO leituras VALUES(1,1,90,'2026-10-23 12:00:00');`);
  criarEstruturaNotificacoes(db);
  criarEstruturaNotificacoes(db);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM notificacoes').get().n, 0);
  db.exec("UPDATE trens SET situacao='manutencao' WHERE id=1");
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM notificacoes').get().n, 1);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  db.close();
});

test('mudanças de manutenção geram eventos apenas nas transições e acompanham a transação', async () => {
  const { tremId } = tremComSensor();
  const dados = await chamar(`/stmt/trains/${tremId}`);
  const body = { prefixo: dados.dados.prefixo, modelo: dados.dados.modelo, ano: dados.dados.ano };
  for (const situacao of ['manutencao', 'manutencao', 'inativo', 'ativo']) {
    assert.equal((await chamar(`/stmt/trains/${tremId}`, 'PUT', { ...body, situacao })).status, 200);
  }
  const eventos = banco.prepare('SELECT * FROM notificacoes ORDER BY id').all();
  assert.deepEqual(eventos.map(evento => evento.tipo), ['manutencao_entrada', 'manutencao_saida']);
  assert.equal(eventos[1].situacao_atual, 'inativo');
  banco.exec('BEGIN');
  banco.prepare("UPDATE trens SET situacao='manutencao' WHERE id=?").run(tremId);
  banco.exec('ROLLBACK');
  assert.equal(banco.prepare('SELECT COUNT(*) AS n FROM notificacoes').get().n, 2);
  const lista = await chamar('/notificacoes');
  assert.equal(lista.dados.notificacoes[0].destino, `/index/trensGerenciamento/editar/${tremId}`);
});

test('sensor alerta acima e abaixo, respeita as bordas, exige limite na mesma unidade e abre o relatório exato', async () => {
  const { sensorId } = tremComSensor();
  for (const valor of [0, 80, 85, -1]) assert.equal((await chamar('/stmt/readings', 'POST', { sensor_id: sensorId, valor })).status, 201);
  const { sensorId: outraUnidade } = tremComSensor('m/s');
  leitura(outraUnidade, 999);
  const { sensorId: semLimite, tremId } = tremComSensor();
  banco.prepare('DELETE FROM limites_trens WHERE trem_id=?').run(tremId);
  leitura(semLimite, 999);
  const lista = await chamar('/notificacoes');
  assert.equal(lista.dados.total_nao_lidas, 2);
  assert.match(lista.dados.notificacoes[0].titulo, /abaixo/);
  assert.match(lista.dados.notificacoes[1].titulo, /acima/);
  for (const notificacao of lista.dados.notificacoes) {
    const id = Number(notificacao.destino.match(/relatorio\/(\d+)/)[1]);
    const relatorio = await chamar(`/stmt/readings/${id}/report`);
    assert.equal(relatorio.status, 200);
    assert.ok(relatorio.dados.medicoes.some(medicao => medicao.id === id && medicao.em_erro));
    assert.ok(notificacao.destino.endsWith(`#medicao-${id}`));
  }
});

test('uma leitura corrigida para erro notifica uma vez e o evento conserva o limite observado', () => {
  const { sensorId, tremId } = tremComSensor();
  const id = leitura(sensorId, 60);
  banco.prepare('UPDATE leituras SET valor=95 WHERE id=?').run(id);
  banco.prepare('UPDATE leituras SET valor=100 WHERE id=?').run(id);
  banco.prepare('UPDATE limites_trens SET valor_maximo=120 WHERE trem_id=?').run(tremId);
  criarEstruturaNotificacoes(banco);
  const eventos = banco.prepare('SELECT * FROM notificacoes').all();
  assert.equal(eventos.length, 1);
  assert.equal(eventos[0].valor, 95);
  assert.equal(eventos[0].limite, 80);
  leitura(sensorId, 125);
  assert.equal(banco.prepare('SELECT COUNT(*) AS n FROM notificacoes').get().n, 2);
});

test('notificações são protegidas e marcações são individuais, inclusive no lote e após reiniciar', async () => {
  const { sensorId } = tremComSensor();
  leitura(sensorId, 90);
  const lista = await chamar('/notificacoes');
  const id = lista.dados.ultimo_id;
  for (const [path, method, body] of [['/notificacoes', 'GET'], [`/notificacoes/${id}/lida`, 'POST'], ['/notificacoes/ler-todas', 'POST', { ate_id: id }]]) {
    assert.equal((await chamar(path, method, body, null)).status, 401);
    assert.equal((await chamar(path, method, body, contas.usuario)).status, 403);
  }
  assert.equal((await chamar(`/notificacoes/${id}/lida`, 'POST', { usuario_id: contas.dev.id })).status, 200);
  assert.equal((await chamar(`/notificacoes/${id}/lida`, 'POST')).status, 200);
  assert.equal((await chamar('/notificacoes')).dados.total_nao_lidas, 0);
  assert.equal((await chamar('/notificacoes', 'GET', undefined, contas.dev)).dados.total_nao_lidas, 1);
  leitura(sensorId, 92);
  const corte = (await chamar('/notificacoes')).dados.ultimo_id;
  leitura(sensorId, 94);
  assert.equal((await chamar('/notificacoes/ler-todas', 'POST', { ate_id: corte })).status, 200);
  assert.equal((await chamar('/notificacoes')).dados.total_nao_lidas, 1);
  assert.equal((await chamar('/notificacoes', 'GET', undefined, contas.dev)).dados.total_nao_lidas, 3);
  execFileSync(process.execPath, ['--input-type=module', '-e', "import('./src/banco.js').then(({default:b})=>b.close())"], { env: process.env });
  assert.equal((await chamar('/notificacoes')).dados.total_nao_lidas, 1);
  assert.equal((await chamar('/notificacoes/0/lida', 'POST')).status, 400);
  assert.equal((await chamar('/notificacoes/999999/lida', 'POST')).status, 404);
});

test('contador inclui eventos além dos 50 exibidos e excluir trem limpa referências sem quebrar links', async () => {
  const { sensorId, tremId } = tremComSensor();
  for (let i = 0; i < 55; i++) leitura(sensorId, 90 + i);
  const lista = await chamar('/notificacoes');
  assert.equal(lista.dados.notificacoes.length, 50);
  assert.equal(lista.dados.total_nao_lidas, 55);
  await chamar('/notificacoes/ler-todas', 'POST', { ate_id: lista.dados.ultimo_id });
  assert.equal((await chamar('/notificacoes')).dados.total_nao_lidas, 0);
  banco.prepare('DELETE FROM trens WHERE id=?').run(tremId);
  assert.equal((await chamar('/notificacoes')).dados.notificacoes.length, 0);
  assert.deepEqual(banco.prepare('PRAGMA foreign_key_check').all(), []);
});

test('somente dev acessa leitura, edição e exclusão de usuários, sem hashes em respostas', async () => {
  for (const [path, method, body] of [['/usuarios', 'GET'], [`/usuarios/${contas.usuario.id}`, 'GET'], [`/usuarios/${contas.usuario.id}`, 'PUT', {}], [`/usuarios/${contas.usuario.id}`, 'DELETE']]) {
    assert.equal((await chamar(path, method, body, null)).status, 401);
    for (const cargo of ['usuario', 'operario']) assert.equal((await chamar(path, method, body, contas[cargo])).status, 403);
  }
  const lista = await chamar('/usuarios', 'GET', undefined, contas.dev);
  assert.equal(lista.status, 200);
  assert.ok(lista.dados.every(usuario => !('senha_hash' in usuario)));
});

test('dev edita dados e alterna usuário/operário, mas não concede dev nem muda seu cargo', async () => {
  const alvo = conta('usuario');
  const body = { fullname: 'Pessoa editada', email: 'pessoa.editada@teste.local', cargo: 'operario', senha_hash: 'nao-salvar' };
  assert.equal((await chamar(`/usuarios/${alvo.id}`, 'PUT', body, contas.dev)).status, 200);
  assert.equal((await chamar('/stmt/trains', 'GET', undefined, alvo)).status, 200);
  assert.equal(banco.prepare('SELECT senha_hash FROM usuarios WHERE id=?').get(alvo.id).senha_hash, 'hash-preservado');
  assert.equal((await chamar(`/usuarios/${alvo.id}`, 'PUT', { ...body, cargo: 'dev' }, contas.dev)).status, 400);
  assert.equal((await chamar(`/usuarios/${alvo.id}`, 'PUT', { ...body, cargo: 'usuario' }, contas.dev)).status, 200);
  assert.equal((await chamar('/stmt/trains', 'GET', undefined, alvo)).status, 403);
  assert.equal((await chamar(`/usuarios/${contas.dev.id}`, 'PUT', { fullname: 'Dev editado', email: 'dev.editado@teste.local', cargo: 'usuario' }, contas.dev)).status, 400);
  assert.equal((await chamar(`/usuarios/${contas.dev.id}`, 'PUT', { fullname: 'Dev editado', email: 'dev.editado@teste.local', cargo: 'dev' }, contas.dev)).status, 200);
});

test('validação preserva os dados em falhas e exclusão revoga sessão e limpa marcações pessoais', async () => {
  const alvo = conta('usuario');
  const existente = (await chamar(`/usuarios/${contas.dev.id}`, 'GET', undefined, contas.dev)).dados;
  const body = { fullname: 'Pessoa', email: existente.email.toUpperCase(), cargo: 'operario' };
  assert.equal((await chamar(`/usuarios/${alvo.id}`, 'PUT', body, contas.dev)).status, 409);
  for (const invalido of [{ ...body, email: 'invalido' }, { ...body, fullname: '' }, { ...body, cargo: 'admin', email: 'valido@teste.local' }]) {
    assert.equal((await chamar(`/usuarios/${alvo.id}`, 'PUT', invalido, contas.dev)).status, 400);
  }
  assert.equal(banco.prepare('SELECT cargo FROM usuarios WHERE id=?').get(alvo.id).cargo, 'usuario');
  assert.equal((await chamar(`/usuarios/${contas.dev.id}`, 'DELETE', undefined, contas.dev)).status, 409);
  const { sensorId } = tremComSensor();
  leitura(sensorId, 95);
  const evento = banco.prepare('SELECT id FROM notificacoes LIMIT 1').get();
  banco.prepare('INSERT INTO notificacoes_lidas(usuario_id,notificacao_id) VALUES(?,?)').run(alvo.id, evento.id);
  assert.equal((await chamar(`/usuarios/${alvo.id}`, 'DELETE', undefined, contas.dev)).status, 200);
  assert.equal((await chamar('/stmt/trains', 'GET', undefined, alvo)).status, 401);
  assert.equal(banco.prepare('SELECT COUNT(*) AS n FROM notificacoes_lidas WHERE usuario_id=?').get(alvo.id).n, 0);
  assert.equal((await chamar('/usuarios/999999', 'GET', undefined, contas.dev)).status, 404);
  assert.equal((await chamar('/usuarios/abc', 'GET', undefined, contas.dev)).status, 400);
  assert.deepEqual(banco.prepare('PRAGMA foreign_key_check').all(), []);
});
