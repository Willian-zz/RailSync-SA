import jwt from 'jsonwebtoken';
import banco from '../src/banco.js';

export function autenticar(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: 'Entre na sua conta para continuar.' });
    const sessao = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = banco.prepare('SELECT id, fullname AS name, email, cargo FROM usuarios WHERE id = ?').get(sessao.id);
    if (!usuario) return res.status(401).json({ message: 'Sessão inválida.' });
    // O banco é a fonte do cargo, inclusive quando o token foi emitido antes de uma alteração.
    req.usuario = usuario;
    next();
  } catch {
    res.status(401).json({ message: 'Sessão inválida ou expirada.' });
  }
}

export function exigirCargos(...cargos) {
  return (req, res, next) => {
    if (req.usuario && (req.usuario.cargo === 'dev' || cargos.includes(req.usuario.cargo))) return next();
    res.status(403).json({ message: 'Seu perfil não tem permissão para acessar esta área.' });
  };
}
