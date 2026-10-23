import express from 'express';
import banco from '../src/banco.js';
import { autenticar, exigirCargos } from '../middleware/permissoes.js';
import { listarNotificacoes } from '../src/notificacoes.js';

const router = express.Router();
router.use(autenticar, exigirCargos('operario'));
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

router.get('/', (req, res) => {
  res.json(listarNotificacoes(banco, req.usuario.id));
});

router.post('/ler-todas', (req, res) => {
  const ateId = req.body?.ate_id;
  if (!Number.isSafeInteger(ateId) || ateId <= 0) {
    return res.status(400).json({ message: 'Informe até qual notificação marcar como lida.' });
  }
  // O corte evita marcar como lido um alerta que chegou depois de abrir a lista.
  banco.prepare(`
    INSERT OR IGNORE INTO notificacoes_lidas (usuario_id, notificacao_id)
    SELECT ?, id FROM notificacoes WHERE id <= ?
  `).run(req.usuario.id, ateId);
  res.json({ message: 'Notificações marcadas como lidas.' });
});

router.post('/:id/lida', (req, res) => {
  const id = Number(req.params.id);
  if (!/^\d+$/.test(req.params.id) || !Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ message: 'Notificação inválida.' });
  }
  if (!banco.prepare('SELECT id FROM notificacoes WHERE id = ?').get(id)) {
    return res.status(404).json({ message: 'Notificação não encontrada.' });
  }
  banco.prepare('INSERT OR IGNORE INTO notificacoes_lidas (usuario_id, notificacao_id) VALUES (?, ?)').run(req.usuario.id, id);
  res.json({ message: 'Notificação marcada como lida.' });
});

router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error(error);
  res.status(500).json({ message: 'Não foi possível atualizar as notificações.' });
});

export default router;
