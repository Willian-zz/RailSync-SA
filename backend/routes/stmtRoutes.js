import express from "express";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import banco from "../src/banco.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

router.get("/trains", async (req, res) => {
    try {
        const trens = banco.prepare(`SELECT * FROM trens`).all();

        if(trens.length <= 0) {
            return res.json({
                message: "Não há trens."
            })
        }

        res.json(trens);
    } catch (error) {
        res.status(401).json({
            message: "Não foi possível fazer a pesquisa."
        })
    }
})

/* router.post("/trains/register", async (req, res) => {
    try {
        const {fullname, email, senha} = req.body;

        if(!fullname || !email || !senha) {
            return res.status(400).json({
                message: "Preencha todos os campos."
            });
        }

        const usuarioExistente = banco.prepare("SELECT id FROM usuarios WHERE email = ?").get(email);

        if(usuarioExistente) {
            return res.status(409).json({
                message: "Este email já está cadastrado."
            });
        }

        const senhaHash = await argon2.hash(senha);

        banco.prepare(`
            INSERT INTO usuarios 
            (fullname, email, senha_hash)
            VALUES (?, ?, ?)
            `)
            .run(fullname, email, senhaHash);

        res.status(201).json({
            message: "Usuário cadastrado com sucesso."
        });
    } catch(error) {
        console.error(error);

        res.status(500).json({
            message: "Erro ao criar usuário."
        });
    }
}); */

export default router;