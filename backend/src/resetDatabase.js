import {DatabaseSync} from "node:sqlite"

const banco = new DatabaseSync("trens.db");

banco.exec(`
    DROP TABLE IF EXISTS usuarios;
    `);

console.log("Tabela usuários apagada com sucesso.");

banco.close;