import { DatabaseSync } from "node:sqlite";

const banco = new DatabaseSync("trens.db");

banco.exec(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullname TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            senha_hash TEXT NOT NULL,
            cargo TEXT NOT NULL DEFAULT 'user'
        )
    `);

export default banco;

/* const total = banco.prepare("SELECT COUNT(*) AS quantidade FROM trens").get();

if (total.quantidade === 0) {
    const inserir = banco.prepare(
        "INSERT INTO trens (prefixo, modelo, ano, situacao) VALUES (?, ?, ?, ?)"
    );

    inserir.run("LOC-1001", "GE AC44i", 2014, "ativo");
    inserir.run("LOC-1002", "EMD SD70ACe", 2011, "manutencao");
    inserir.run("LOC-1003", "GE Dash 9", 2006, "ativo");
    inserir.run("AUT-2001", "Automotriz VLI", 2019, "ativo");
    inserir.run("LOC-1004", "EMD GT46AC", 1999, "inativo");
}; */