import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { popularBanco } from "../src/dadosIniciais.js";

test("migra dados antigos, conserva IDs e valores e não duplica ao reiniciar", async () => {
  const pasta = mkdtempSync(join(tmpdir(), "railsync-seed-"));
  process.env.NODE_ENV = "test";
  process.env.DATABASE_PATH = join(pasta, "trens.db");
  const { default: banco } = await import("../src/banco.js");
  try {
    const inserirTrem = banco.prepare("INSERT INTO trens (prefixo, modelo, ano) VALUES (?, 'GE AC44i', 2020)");
    const inserirSensor = banco.prepare("INSERT INTO sensores (codigo, tipo, unidade, trem_id) VALUES (?, 'velocidade', 'km/h', ?)");
    const inserirLeitura = banco.prepare("INSERT INTO leituras (sensor_id, valor, registrada_em) VALUES (?, ?, '2026-10-19 13:00:00')");
    const primeiro = Number(inserirTrem.run("DEMO-001").lastInsertRowid);
    const segundo = Number(inserirTrem.run("DEMO-002").lastInsertRowid);
    const sensorId = Number(inserirSensor.run("DEMO-SEN-001", primeiro).lastInsertRowid);
    inserirSensor.run("DEMO-SEN-006", segundo);
    const leituraId = Number(inserirLeitura.run(sensorId, 64).lastInsertRowid);
    banco.prepare("INSERT INTO limites_trens (trem_id, tipo, unidade, valor_maximo) VALUES (?, 'velocidade', 'km/h', 75)").run(primeiro);

    popularBanco(banco);
    assert.equal(banco.prepare("SELECT id FROM trens WHERE prefixo = 'LOC-2001'").get().id, primeiro);
    assert.equal(banco.prepare("SELECT id FROM trens WHERE prefixo = 'LOC-2002'").get().id, segundo);
    assert.equal(banco.prepare("SELECT id FROM sensores WHERE codigo = 'SEN-201'").get().id, sensorId);
    assert.deepEqual({ ...banco.prepare("SELECT sensor_id, valor FROM leituras WHERE id = ?").get(leituraId) }, { sensor_id: sensorId, valor: 64 });
    assert.equal(banco.prepare("SELECT valor_maximo FROM limites_trens WHERE trem_id = ? AND tipo = 'velocidade'").get(primeiro).valor_maximo, 75);
    assert.equal(banco.prepare("SELECT COUNT(*) AS n FROM trens WHERE prefixo IN ('LOC-2001','LOC-2002','LOC-2003','AUT-3001')").get().n, 4);
    assert.equal(banco.prepare("SELECT COUNT(*) AS n FROM sensores WHERE codigo LIKE 'SEN-2%' ").get().n, 20);
    assert.equal(banco.prepare("SELECT COUNT(*) AS n FROM leituras WHERE sensor_id IN (SELECT id FROM sensores WHERE codigo LIKE 'SEN-2%')").get().n, 160);
    assert.equal(banco.prepare("SELECT COUNT(*) AS n FROM trens WHERE prefixo LIKE 'DEMO-%'").get().n, 0);
    assert.equal(banco.prepare("SELECT COUNT(*) AS n FROM sensores WHERE codigo LIKE 'DEMO-%'").get().n, 0);
    assert.equal(banco.prepare("SELECT COUNT(*) AS n FROM linhas").get().n, 3);
    popularBanco(banco);
    assert.equal(banco.prepare("SELECT COUNT(*) AS n FROM leituras WHERE sensor_id IN (SELECT id FROM sensores WHERE codigo LIKE 'SEN-2%')").get().n, 160);
    assert.equal(banco.prepare("PRAGMA foreign_key_check").all().length, 0);
  } finally {
    banco.close();
    rmSync(pasta, { recursive: true, force: true });
  }
});
