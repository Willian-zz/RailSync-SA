import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { after, test } from "node:test";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { listarLeituras, validarLimites } from "../src/leituras.js";

const diretorio = mkdtempSync(join(tmpdir(), "railsync-test-"));
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "railsync-test-leituras";
process.env.DATABASE_PATH = join(diretorio, "trens.db");
const { default: banco } = await import("../src/banco.js");
const usuarioId = banco.prepare("INSERT INTO usuarios (fullname, email, senha_hash, cargo) VALUES ('Operário', 'leituras@test.local', 'teste', 'operario')").run().lastInsertRowid;
const token = jwt.sign({ id: Number(usuarioId) }, process.env.JWT_SECRET);
const { default: rotas } = await import("../routes/stmtRoutes.js");
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/api/stmt", rotas);
const servidor = app.listen(0, "127.0.0.1");
await new Promise((resolve) => servidor.once("listening", resolve));
const url = `http://127.0.0.1:${servidor.address().port}/api/stmt`;

after(async () => {
  await new Promise((resolve) => servidor.close(resolve));
  banco.close();
  rmSync(diretorio, { recursive: true, force: true });
});

async function chamar(caminho, metodo = "GET", dados) {
  const resposta = await fetch(`${url}${caminho}`, {
    method: metodo,
    headers: { "Content-Type": "application/json", Cookie: `token=${token}` },
    body: dados === undefined ? undefined : JSON.stringify(dados),
  });
  return { status: resposta.status, dados: await resposta.json() };
}

function inserirSensor(tremId, codigo, tipo, unidade) {
  return Number(banco.prepare(`
    INSERT INTO sensores (trem_id, codigo, tipo, unidade) VALUES (?, ?, ?, ?)
  `).run(tremId, codigo, tipo, unidade).lastInsertRowid);
}

function inserirLeitura(sensorId, valor, data) {
  banco.prepare(`
    INSERT INTO leituras (sensor_id, valor, registrada_em) VALUES (?, ?, ?)
  `).run(sensorId, valor, data);
}

const limites = [
  { tipo: "velocidade", unidade: "km/h", valor_minimo: 0, valor_maximo: 80 },
  { tipo: "temperatura", unidade: "°C", valor_minimo: -10, valor_maximo: 90 },
  { tipo: "consumo", unidade: "L/h", valor_maximo: 100 },
  { tipo: "vibracao", unidade: "mm/s", valor_maximo: 5 },
  { tipo: "capacidade", unidade: "%", valor_maximo: 100 },
];

test("validação aceita zero, valores negativos e limites de um único lado", () => {
  const resultado = validarLimites(limites);
  assert.equal(resultado[0].valor_minimo, 0);
  assert.equal(resultado[1].valor_minimo, -10);
  assert.equal(resultado[2].valor_minimo, null);
  assert.deepEqual(validarLimites([]), []);
});

test("validação rejeita intervalos invertidos, tipos duplicados e valores inválidos", () => {
  for (const invalido of [
    null,
    [null],
    [{ tipo: "peso", unidade: "kg", valor_maximo: 1 }],
    [limites[0], limites[0]],
    [{ ...limites[0], unidade: " " }],
    [{ ...limites[0], valor_minimo: 90 }],
    [{ ...limites[0], valor_maximo: "80" }],
    [{ ...limites[0], valor_maximo: Infinity }],
    [{ tipo: "velocidade", unidade: "km/h" }],
  ]) {
    assert.throws(() => validarLimites(invalido), { status: 400 });
  }
});

test("API, agrupamento, alertas e persistência dos limites", async (t) => {
  const dadosTrem = { prefixo: "TEST-001", modelo: "Teste", ano: 2025, situacao: "ativo", limites };
  const criacao = await chamar("/trains", "POST", dadosTrem);
  assert.equal(criacao.status, 201);
  const tremId = criacao.dados.id;
  const sensores = limites.map((limite, indice) =>
    inserirSensor(tremId, `TEST-SEN-00${indice + 1}`, limite.tipo, limite.unidade),
  );

  await t.test("salva e recupera os limites junto com o trem", async () => {
    const resposta = await chamar(`/trains/${tremId}`);
    assert.equal(resposta.status, 200);
    assert.equal(resposta.dados.limites.length, 5);
  });

  await t.test("agrupa o mesmo instante, mantém sensores do mesmo tipo e não mistura horários", () => {
    const outroSensor = inserirSensor(tremId, "TEST-SEN-006", "velocidade", "km/h");
    [81, 90, 101, 6, 100].forEach((valor, indice) =>
      inserirLeitura(sensores[indice], valor, "2026-10-19 12:00:00"),
    );
    inserirLeitura(outroSensor, 20, "2026-10-19T09:00:00-03:00");
    inserirLeitura(sensores[0], 0, "2026-10-19T12:01:00.000Z");

    const registros = listarLeituras(banco);
    assert.equal(registros.length, 2);
    assert.equal(registros[0].registrada_em, "2026-10-19T12:01:00.000Z");
    assert.equal(registros[0].medicoes.velocidade[0].valor, 0);
    assert.deepEqual(registros[0].medicoes.temperatura, []);
    assert.equal(registros[0].em_erro, false);
    assert.equal(registros[1].medicoes.velocidade.length, 2);
    assert.equal(registros[1].alertas.length, 3);
    assert.equal(registros[1].medicoes.temperatura[0].em_erro, false);
    assert.equal(registros[1].medicoes.capacidade[0].em_erro, false);
  });

  await t.test("relatório abre leituras normais e com erro, com diferenças e limites reais", async () => {
    const registros = listarLeituras(banco);
    const normal = await chamar(`/readings/${registros[0].leitura_id}/report`);
    assert.equal(normal.status, 200);
    assert.equal(normal.dados.leitura.em_erro, false);
    assert.equal(normal.dados.medicoes[0].valor, 0);
    assert.equal(normal.dados.medicoes[0].diferenca, 0);
    assert.equal(normal.dados.medicoes[0].limite_minimo, 0);

    const erro = await chamar(`/readings/${registros[1].leitura_id}/report`);
    assert.equal(erro.status, 200);
    assert.equal(erro.dados.leitura.em_erro, true);
    assert.equal(erro.dados.medicoes.length, 6);
    assert.equal(erro.dados.medicoes.filter((item) => item.em_erro).length, 3);
    assert.equal(erro.dados.medicoes.find((item) => item.valor === 81).diferenca, 1);
    assert.equal(erro.dados.sensores.length, 6);
    assert.equal(erro.dados.sensores.flatMap((sensor) => sensor.pontos).length, 7);
    assert.equal(erro.dados.sensores.find((sensor) => sensor.id === sensores[0]).pontos.length, 2);
    assert.ok(erro.dados.sensores.every((sensor) => sensor.pontos.every((ponto) => ponto.id && ponto.registrada_em)));
    assert.equal((await chamar("/readings/abc/report")).status, 400);
    assert.equal((await chamar("/readings/99999/report")).status, 404);
  });

  await t.test("atualizar relatório mantém a leitura selecionada e consulta novos pontos e limites", async () => {
    const selecionada = listarLeituras(banco).find((item) => item.em_erro);
    const novoId = Number(banco.prepare(`
      INSERT INTO leituras (sensor_id, valor, registrada_em) VALUES (?, 10, '2026-10-19T12:05:00Z')
    `).run(sensores[0]).lastInsertRowid);
    banco.prepare("UPDATE limites_trens SET valor_maximo = 70 WHERE trem_id = ? AND tipo = 'velocidade'").run(tremId);
    try {
      const { dados } = await chamar(`/readings/${selecionada.leitura_id}/report`);
      assert.equal(dados.leitura.registrada_em, selecionada.registrada_em);
      assert.equal(dados.medicoes.find((item) => item.valor === 81).diferenca, 11);
      assert.equal(dados.sensores.find((sensor) => sensor.id === sensores[0]).pontos.at(-1).valor, 10);
    } finally {
      banco.prepare("DELETE FROM leituras WHERE id = ?").run(novoId);
      banco.prepare("UPDATE limites_trens SET valor_maximo = 80 WHERE trem_id = ? AND tipo = 'velocidade'").run(tremId);
    }
  });

  await t.test("histórico do relatório não inclui sensores de outro trem", async () => {
    const outro = await chamar("/trains", "POST", {
      prefixo: "OUTRO-RELATORIO", modelo: "Teste", ano: 2025, situacao: "ativo",
    });
    const outroId = outro.dados.id;
    try {
      const sensorId = inserirSensor(outroId, "OUTRO-SENSOR", "velocidade", "km/h");
      inserirLeitura(sensorId, 900, "2026-10-19T12:00:00Z");
      const selecionada = listarLeituras(banco, { tremId })[0];
      const { dados } = await chamar(`/readings/${selecionada.leitura_id}/report`);
      assert.equal(dados.trem.id, tremId);
      assert.ok(!dados.sensores.some((sensor) => sensor.id === sensorId));
    } finally {
      await chamar(`/trains/${outroId}`, "DELETE");
    }
  });

  await t.test("mínimo e máximo são inclusivos; abaixo do mínimo gera aviso", () => {
    inserirLeitura(sensores[1], -11, "2026-10-19T12:02:00Z");
    const registro = listarLeituras(banco)[0];
    assert.equal(registro.alertas[0].direcao, "abaixo");
    assert.equal(registro.alertas[0].limite, -10);
  });

  await t.test("relatório calcula diferença abaixo do mínimo", async () => {
    const selecionada = listarLeituras(banco)[0];
    const { dados } = await chamar(`/readings/${selecionada.leitura_id}/report`);
    assert.equal(dados.medicoes[0].direcao, "abaixo");
    assert.equal(dados.medicoes[0].diferenca, 1);
  });

  await t.test("pesquisa por prefixo e filtros retornam somente os erros solicitados", async () => {
    const erros = await chamar("/readings?pesquisa=test-001&erro=todos");
    assert.equal(erros.status, 200);
    assert.equal(erros.dados.length, 2);
    assert.ok(erros.dados.every((registro) => registro.em_erro));
    assert.equal((await chamar("/readings?erro=velocidade")).dados.length, 1);
    assert.equal((await chamar("/readings?erro=capacidade")).dados.length, 0);
    assert.equal((await chamar("/readings?pesquisa=inexistente")).dados.length, 0);
    assert.equal((await chamar("/readings?erro=invalido")).status, 400);
  });

  await t.test("leituras sem limite ou com outra unidade não geram falsos avisos", async () => {
    const sensor = inserirSensor(tremId, "TEST-SEN-007", "consumo", "L/km");
    inserirLeitura(sensor, 200, "2026-10-19T12:03:00Z");
    const registro = listarLeituras(banco)[0];
    assert.equal(registro.sem_limite, true);
    assert.equal(registro.em_erro, false);
    const relatorio = await chamar(`/readings/${registro.leitura_id}/report`);
    assert.equal(relatorio.dados.medicoes[0].limite_configurado, false);
    assert.equal(relatorio.dados.medicoes[0].diferenca, null);
  });

  await t.test("registra zero e rejeita sensor inexistente, valor vazio e data inválida", async () => {
    assert.equal((await chamar("/readings", "POST", {
      sensor_id: sensores[0], valor: 0, registrada_em: "2026-10-19T09:04:00-03:00",
    })).status, 201);
    assert.equal(listarLeituras(banco)[0].registrada_em, "2026-10-19T12:04:00.000Z");
    assert.equal((await chamar("/readings", "POST", { sensor_id: 99999, valor: 10 })).status, 404);
    assert.equal((await chamar("/readings", "POST", { sensor_id: sensores[0], valor: null })).status, 400);
    assert.equal((await chamar("/readings", "POST", {
      sensor_id: sensores[0], valor: 10, registrada_em: "2026-10-19 12:04:00",
    })).status, 400);
  });

  await t.test("editar sem enviar limites preserva a configuração; erro não altera o trem", async () => {
    const { limites: ignorados, ...semLimites } = dadosTrem;
    assert.equal(ignorados.length, 5);
    assert.equal((await chamar(`/trains/${tremId}`, "PUT", semLimites)).status, 200);
    assert.equal((await chamar(`/trains/${tremId}`)).dados.limites.length, 5);
    const invalido = await chamar(`/trains/${tremId}`, "PUT", {
      ...dadosTrem, prefixo: "NAO-SALVAR", limites: [{ ...limites[0], valor_minimo: 100 }],
    });
    assert.equal(invalido.status, 400);
    assert.equal((await chamar(`/trains/${tremId}`)).dados.prefixo, "TEST-001");
  });

  await t.test("reiniciar o banco mantém leituras, trens e limites existentes", () => {
    execFileSync(process.execPath, ["--input-type=module", "-e", "import './src/banco.js'"], {
      cwd: new URL("../", import.meta.url), env: process.env, stdio: "pipe",
    });
    assert.equal(banco.prepare("SELECT COUNT(*) AS total FROM limites_trens WHERE trem_id = ?").get(tremId).total, 5);
    assert.equal(listarLeituras(banco).length, 5);
  });

  await t.test("enviar uma lista vazia remove limites e recalcula os avisos", async () => {
    assert.equal((await chamar(`/trains/${tremId}`, "PUT", { ...dadosTrem, limites: [] })).status, 200);
    assert.ok(listarLeituras(banco).every((registro) => !registro.em_erro && registro.sem_limite));
  });

  await t.test("excluir o trem remove seus sensores, leituras e limites pela chave estrangeira", async () => {
    await chamar(`/trains/${tremId}`, "PUT", dadosTrem);
    assert.equal((await chamar(`/trains/${tremId}`, "DELETE")).status, 200);
    assert.equal(banco.prepare("SELECT COUNT(*) AS total FROM sensores WHERE trem_id = ?").get(tremId).total, 0);
    assert.equal(banco.prepare("SELECT COUNT(*) AS total FROM limites_trens WHERE trem_id = ?").get(tremId).total, 0);
    assert.equal(banco.prepare("SELECT COUNT(*) AS total FROM leituras").get().total, 0);
  });
});
