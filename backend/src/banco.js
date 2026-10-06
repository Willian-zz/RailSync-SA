import { DatabaseSync } from "node:sqlite";

const banco = new DatabaseSync("trens.db");

banco.exec(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullname TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            senha_hash TEXT NOT NULL,
            cargo TEXT NOT NULL DEFAULT 'user'
        );

        CREATE TABLE IF NOT EXISTS linhas (
            id INTEGER PRIMARY KEY,
            nome TEXT NOT NULL COLLATE NOCASE UNIQUE
        );

        CREATE TABLE IF NOT EXISTS trens (
            id INTEGER PRIMARY KEY,
            prefixo TEXT NOT NULL COLLATE NOCASE UNIQUE,
            modelo TEXT NOT NULL,
            ano INTEGER NOT NULL CHECK (ano BETWEEN 1900 AND 2100),
            situacao TEXT NOT NULL DEFAULT 'ativo'
                CHECK (situacao IN ('ativo', 'manutencao', 'inativo')),
            linha_id INTEGER,
            FOREIGN KEY (linha_id) REFERENCES linhas(id)
                ON UPDATE CASCADE
                ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS sensores (
            id INTEGER PRIMARY KEY,
            codigo TEXT NOT NULL COLLATE NOCASE UNIQUE,
            tipo TEXT NOT NULL,
            unidade TEXT NOT NULL,
            trem_id INTEGER NOT NULL,
            FOREIGN KEY (trem_id) REFERENCES trens(id)
                ON UPDATE CASCADE
                ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS leituras (
            id INTEGER PRIMARY KEY,
            sensor_id INTEGER NOT NULL,
            valor REAL NOT NULL,
            registrada_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sensor_id) REFERENCES sensores(id)
                ON UPDATE CASCADE
                ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_trens_linha
            ON trens(linha_id);

        CREATE INDEX IF NOT EXISTS idx_sensores_trem
            ON sensores(trem_id);

        CREATE INDEX IF NOT EXISTS idx_leituras_sensor_data
            ON leituras(sensor_id, registrada_em DESC);
    `);

const total = banco.prepare("SELECT COUNT(*) AS quantidade FROM trens").get();

if (total.quantidade === 0) {
  const inserir = banco.prepare(
    "INSERT INTO trens (prefixo, modelo, ano, situacao) VALUES (?, ?, ?, ?)",
  );

  inserir.run("LOC-1001", "GE AC44i", 2014, "ativo");
  inserir.run("LOC-1002", "EMD SD70ACe", 2011, "manutencao");
  inserir.run("LOC-1003", "GE Dash 9", 2006, "ativo");
  inserir.run("AUT-2001", "Automotriz VLI", 2019, "ativo");
  inserir.run("LOC-1004", "EMD GT46AC", 1999, "inativo");
}

export default banco;
