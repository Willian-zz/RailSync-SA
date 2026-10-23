function rejeitar(status, message) {
  throw Object.assign(new Error(message), { status });
}

function emTransacao(banco, operacao) {
  banco.exec('BEGIN IMMEDIATE');
  try {
    const resultado = operacao();
    banco.exec('COMMIT');
    return resultado;
  } catch (error) {
    if (banco.isTransaction) banco.exec('ROLLBACK');
    throw error;
  }
}

export function obterUsuario(banco, id) {
  return banco.prepare('SELECT id, fullname, email, cargo FROM usuarios WHERE id = ?').get(id);
}

export function editarUsuario(banco, id, dados) {
  const { fullname, email } = dados ?? {};
  if (typeof fullname !== 'string' || !fullname.trim() || fullname.trim().length > 150) {
    rejeitar(400, 'Informe um nome com até 150 caracteres.');
  }
  if (typeof email !== 'string' || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    rejeitar(400, 'Informe um email válido.');
  }

  return emTransacao(banco, () => {
    const atual = obterUsuario(banco, id);
    if (!atual) rejeitar(404, 'Usuário não encontrado.');
    const cargo = dados.cargo ?? atual.cargo;

    if (atual.cargo === 'dev') {
      if (cargo !== 'dev') rejeitar(400, 'O cargo de uma conta dev não pode ser alterado por esta página.');
    } else if (!['usuario', 'operario'].includes(cargo)) {
      rejeitar(400, 'O cargo só pode ser usuário ou operário.');
    }

    const repetido = banco.prepare('SELECT id FROM usuarios WHERE email = ? COLLATE NOCASE AND id != ?').get(email.trim(), id);
    if (repetido) rejeitar(409, 'Este email já está sendo utilizado por outra conta.');

    banco.prepare('UPDATE usuarios SET fullname = ?, email = ?, cargo = ? WHERE id = ?').run(fullname.trim(), email.trim(), cargo, id);
    return obterUsuario(banco, id);
  });
}

export function excluirUsuario(banco, id, responsavelId) {
  return emTransacao(banco, () => {
    const usuario = obterUsuario(banco, id);
    if (!usuario) rejeitar(404, 'Usuário não encontrado.');
    if (id === responsavelId) rejeitar(409, 'Você não pode excluir sua própria conta.');
    if (usuario.cargo === 'dev' && banco.prepare("SELECT COUNT(*) AS total FROM usuarios WHERE cargo = 'dev'").get().total <= 1) {
      rejeitar(409, 'Não é possível excluir o último dev do sistema.');
    }
    banco.prepare('DELETE FROM usuarios WHERE id = ?').run(id);
  });
}
