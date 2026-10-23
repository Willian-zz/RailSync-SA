import express from 'express';
import banco from '../src/banco.js';
import { autenticar, exigirCargos } from '../middleware/permissoes.js';
import { consultarRede, idValido, salvarCadastro } from '../src/rede.js';
const router = express.Router();
router.use(autenticar);
router.get('/consulta', (req, res) => res.set('Cache-Control', 'no-store').json(consultarRede(banco)));
router.use(exigirCargos('operario'));
router.get('/opcoes', (req, res) => {
  res.json({ ...consultarRede(banco), trens: banco.prepare('SELECT id, prefixo, modelo, situacao, linha_id FROM trens ORDER BY prefixo').all() });
});
function erro(res, error) {
  if (error.status) return res.status(error.status).json({ message: error.message });
  console.error(error);
  res.status(500).json({ message: 'Não foi possível salvar as alterações.' });
}
for (const tipo of ['rotas', 'linhas']) {
  router.get(`/${tipo}`, (req, res) => res.set('Cache-Control', 'no-store').json(consultarRede(banco)[tipo]));
  router.get(`/${tipo}/:id`, (req, res) => {
    try {
      const registro = consultarRede(banco)[tipo].find(r => r.id === idValido(req.params.id));
      if (!registro) return res.status(404).json({ message: 'Registro não encontrado.' });
      res.json(registro);
    } catch (error) { erro(res, error); }
  });
  router.post(`/${tipo}`, (req, res) => {
    try { res.status(201).json({ id: salvarCadastro(banco, tipo, req.body), message: 'Cadastro realizado com sucesso.' }); }
    catch (error) { erro(res, error); }
  });
  router.put(`/${tipo}/:id`, (req, res) => {
    try { res.json({ id: salvarCadastro(banco, tipo, req.body, idValido(req.params.id)), message: 'Cadastro atualizado com sucesso.' }); }
    catch (error) { erro(res, error); }
  });
  router.delete(`/${tipo}/:id`, (req, res) => {
    try {
      const resultado = banco.prepare(`DELETE FROM ${tipo} WHERE id = ?`).run(idValido(req.params.id));
      if (!resultado.changes) return res.status(404).json({ message: 'Registro não encontrado.' });
      res.json({ message: 'Registro excluído com sucesso.' });
    } catch (error) { erro(res, error); }
  });
}
export default router;
