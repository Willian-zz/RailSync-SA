import express from 'express';
import banco from '../src/banco.js';
import { autenticar, exigirCargos } from '../middleware/permissoes.js';
import { obterDashboard } from '../src/dashboard.js';

const router = express.Router();
router.use(autenticar, exigirCargos('operario'));

router.get('/', (req, res) => {
  try {
    res.set('Cache-Control', 'no-store').json(obterDashboard(banco, req.query.escopo ?? 'historico'));
  } catch (error) {
    if (!error.status) console.error(error);
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Não foi possível carregar o dashboard.' });
  }
});

export default router;
