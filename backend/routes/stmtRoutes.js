import express from "express";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import banco from "../src/banco.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

router.get("/trains", async (req, res) => {
    try {
        const trens = banco.prepare(`SELECT * FROM trens`).all();

        res.json(trens);
    } catch (error) {
        res.status(401).json({
            message: "Não foi possível fazer a pesquisa."
        })
    }
})

router.get("/trains/status", async (req, res) => {
    try {
        const situacao = banco.prepare(`SELECT situacao, COUNT(*) AS quantidade FROM trens GROUP BY situacao`).all();

        if(situacao.length <= 0) {
            return res.json({
                message: "Não há trens."
            })
        }

        const resultado = Object.fromEntries(
            situacao.map(item => [item.situacao, item.quantidade])
        );

        res.json(resultado);
    } catch (error) {
        res.status(500).json({
            message: "Não foi possível fazer a pesquisa."
        })
    }
})

router.get("/trains/:id", async (req, res) => {
    try {
        const {id} = req.params;

        const trem = banco.prepare(`SELECT * FROM trens WHERE id = ?`).get(id);

        if(!trem) {
            return res.status(404).json({
                message : "Trem não encontrado."
            })
        }

        res.json(trem);
    } catch (error) {
        res.status(401).json({
            message: "Não foi possível fazer a pesquisa."
        })
    }
})

router.post("/trains", async(req, res) => {
    try {
        const {prefixo, modelo, ano, situacao} = req.body;

        if(!prefixo || !modelo || !ano || !situacao) {
            return res.status(400).json({
                message: "Preencha todos os campos."
            });
        }

        const tremExistente = banco.prepare("SELECT id FROM trens WHERE prefixo = ?").get(prefixo);

        if(tremExistente) {
            return res.status(409).json({
                message: "Este trem já está cadastrado."
            });
        }

        banco.prepare(`
            INSERT INTO trens
            (prefixo, modelo, ano, situacao)
            VALUES (?, ?, ?, ?)
            `)
            .run(prefixo, modelo, ano, situacao);

        res.status(201).json({
            message: "Trem cadastrado com sucesso."
        });
    } catch(error) {
        console.error(error);

        res.status(500).json({
            message: "Erro ao criar o trem."
        });
    }
})

router.put("/trains/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { prefixo, modelo, ano, situacao } = req.body;

        if (!prefixo || !modelo || !ano || !situacao) {
            return res.status(400).json({
                message: "Preencha todos os campos."
            });
        }

        // Verifica se o trem existe
        const tremExistente = banco.prepare(
            "SELECT id FROM trens WHERE id = ?"
        ).get(id);

        if (!tremExistente) {
            return res.status(404).json({
                message: "Trem não encontrado."
            });
        }

        // Verifica se outro trem já utiliza prefixo
        const prefixoExistente = banco.prepare(
            "SELECT id FROM trens WHERE prefixo = ? AND id != ?"
        ).get(prefixo, id);

        if (prefixoExistente) {
            return res.status(409).json({
                message: "Este prefixo já está sendo utilizado por outro trem."
            });
        }

        // Atualiza os dados do trem
        banco.prepare(`
            UPDATE trens
            SET prefixo = ?, modelo = ?, ano = ?, situacao = ?
            WHERE id = ?
        `).run(prefixo, modelo, ano, situacao, id);

        return res.status(200).json({
            message: "Trem atualizado com sucesso."
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Erro ao atualizar o trem."
        });
    }
});

router.delete("/trains/:id", (req, res) => {
    try {
        const {id} = req.params;

        const resultado = banco.prepare("DELETE FROM trens WHERE id = ?").run(id);

        if(resultado.changes === 0){
            return res.status(404).json({
                message: "Trem não encontrado." 
            });
        }

        res.json({
            message: "Trem excluído com sucesso."
        })
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Erro ao excluir o trem."
        });
    }
});

export default router;