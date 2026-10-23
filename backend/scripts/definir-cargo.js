import banco from '../src/banco.js';
const [email, cargo] = process.argv.slice(2);
try {
  if (!email || !['usuario', 'operario', 'dev'].includes(cargo)) {
    throw new Error('Uso: npm run cargo -- email@exemplo.com usuario|operario|dev');
  }
  const resultado = banco.prepare('UPDATE usuarios SET cargo = ? WHERE email = ? COLLATE NOCASE').run(cargo, email);
  if (!resultado.changes) throw new Error('Conta não encontrada. Cadastre a conta antes de atribuir o cargo.');
  console.log(`Cargo atualizado para ${cargo}. Atualize a página do site.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally { banco.close(); }
