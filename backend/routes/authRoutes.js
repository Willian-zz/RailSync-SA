import express from "express";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import banco from "../src/banco.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

router.post("/register", async (req, res) => {
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
});

router.post("/login", async (req, res) => {
    try {
        const {email, senha} = req.body;

        if(!email || !senha) {
            return res.status(400).json({
                message: "Preencha todos os campos."
            });
        }

        const usuario = banco.prepare("SELECT * FROM usuarios WHERE email = ?").get(email);

        if(!usuario) {
            return res.status(401).json({
                message: "Email ou senha inválido"
            });
        }

        const senhaValida = await argon2.verify(usuario.senha_hash, senha)

        if(!senhaValida) {
            return res.status(401).json({
                message: "Email ou senha inválido"
            });
        }

        const token = jwt.sign(
            {
                id: usuario.id,
                email: usuario.email,
                name: usuario.fullname,
                cargo: usuario.cargo
            },
            JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 60 * 60 * 1000
        });

        res.json({
            message: "Login realizado com sucesso.",
            usuario: {
                id: usuario.id,
                fullname: usuario.fullname,
                email: usuario.email,
                cargo: usuario.cargo
            }
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Erro ao realizar login."
        })
    }
});

router.post("/logout", (req, res) => {
    res.clearCookie("token");

    res.json({
        message: "Sessão finalizada com sucesso."
    })
});

router.get("/", (req, res) => {
    const usuarios = banco.prepare(`SELECT * FROM usuarios`).all();

    res.json(usuarios);
})

router.get("/check", (req, res) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({
            autenticado: false
        });
    }

    try {
        const usuario = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        res.json({
            autenticado: true,
            usuario
        });

    } catch (error) {
        res.status(401).json({
            autenticado: false
        });
    }
});

router.get("/me", (req, res) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({
            message: "Não autenticado."
        });
    }

    try {
        const usuario = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const userId = usuario.id;
        const userName = usuario.name;
        const userEmail = usuario.email;

        res.json({
            id: userId,
            name: userName,
            email: userEmail
        })

    } catch (error) {
        res.status(401).json({
            message: "Sessão inválida."
        });
    }
});

export default router;