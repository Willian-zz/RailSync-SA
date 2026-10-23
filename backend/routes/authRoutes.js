import express from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import banco from '../src/banco.js';
import { autenticar, exigirCargos } from '../middleware/permissoes.js';

const router = express.Router();
router.post('/register', async (req, res) => {
  const { fullname, email, senha } = req.body ?? {};
  if (![fullname, email, senha].every(v => typeof v === 'string' && v.trim()) || senha.length < 8) {
    return res.status(400).json({ message: 'Preencha nome, email e uma senha com ao menos 8 caracteres.' });
  }
  try {
    if (banco.prepare('SELECT id FROM usuarios WHERE email = ? COLLATE NOCASE').get(email.trim())) {
      return res.status(409).json({ message: 'Este email já está cadastrado.' });
    }
    const hash = await argon2.hash(senha);
    // O cadastro público sempre cria um usuário comum, independente do corpo recebido.
    banco.prepare("INSERT INTO usuarios (fullname, email, senha_hash, cargo) VALUES (?, ?, ?, 'usuario')").run(fullname.trim(), email.trim(), hash);
    res.status(201).json({ message: 'Usuário cadastrado com sucesso.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao criar usuário.' });
  }
});
router.post('/login', async (req, res) => {
  const { email, senha } = req.body ?? {};
  if (typeof email !== 'string' || typeof senha !== 'string') return res.status(400).json({ message: 'Preencha email e senha.' });
  try {
    const usuario = banco.prepare('SELECT * FROM usuarios WHERE email = ? COLLATE NOCASE').get(email.trim());
    if (!usuario || !await argon2.verify(usuario.senha_hash, senha)) return res.status(401).json({ message: 'Email ou senha inválido.' });
    const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 3600000 });
    res.json({ message: 'Login realizado com sucesso.', usuario: { id: usuario.id, fullname: usuario.fullname, email: usuario.email, cargo: usuario.cargo } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao realizar login.' });
  }
});
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Sessão finalizada com sucesso.' });
});
router.get('/check', autenticar, (req, res) => res.set('Cache-Control', 'no-store').json({ autenticado: true, usuario: req.usuario }));
router.get('/me', autenticar, (req, res) => res.set('Cache-Control', 'no-store').json(req.usuario));
router.get('/', autenticar, exigirCargos('dev'), (req, res) => {
  res.json(banco.prepare('SELECT id, fullname, email, cargo FROM usuarios ORDER BY fullname').all());
});
export default router;
