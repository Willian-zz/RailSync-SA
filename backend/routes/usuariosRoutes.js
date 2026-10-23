import express from 'express';
import banco from '../src/banco.js';
import { autenticar, exigirCargos } from '../middleware/permissoes.js';
import { editarUsuario, excluirUsuario, obterUsuario } from '../src/usuarios.js';

const router = express.Router();
router.use(autenticar, exigirCargos('dev'));
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

router.param('id', (req, res, next, valor) => {
  const id = Number(valor);
  if (!/^\d+$/.test(valor) || !Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ message: 'Identificador de usuário inválido.' });
  }
  req.usuarioAlvoId = id;
  next();
});

router.get('/', (req, res) => {
  res.json(banco.prepare('SELECT id, fullname, email, cargo FROM usuarios ORDER BY fullname COLLATE NOCASE, id').all());
});

router.get('/:id', (req, res) => {
  const usuario = obterUsuario(banco, req.usuarioAlvoId);
  if (!usuario) return res.status(404).json({ message: 'Usuário não encontrado.' });
  res.json(usuario);
});

router.put('/:id', (req, res) => {
  res.json(editarUsuario(banco, req.usuarioAlvoId, req.body));
});

router.delete('/:id', (req, res) => {
  excluirUsuario(banco, req.usuarioAlvoId, req.usuario.id);
  res.json({ message: 'Usuário excluído com sucesso.' });
});

router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (!error.status) console.error(error);
  res.status(error.status || 500).json({ message: error.status ? error.message : 'Não foi possível gerenciar os usuários.' });
});

export default router;
