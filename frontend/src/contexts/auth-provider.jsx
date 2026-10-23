import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './auth-context';
import { api } from '@/lib/api';

const buscarUsuario = () => api('/auth/check', { cache: 'no-store' }).then(d => d.usuario).catch(() => null);

export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState({ carregando: true, usuario: null });
  const atualizarSessao = useCallback(async () => {
    const usuario = await buscarUsuario();
    setSessao({ carregando: false, usuario });
    return usuario;
  }, []);
  useEffect(() => {
    let ativo = true;
    buscarUsuario().then(usuario => { if (ativo) setSessao({ carregando: false, usuario }); });
    window.addEventListener('focus', atualizarSessao);
    return () => { ativo = false; window.removeEventListener('focus', atualizarSessao); };
  }, [atualizarSessao]);
  const value = useMemo(() => ({ ...sessao, atualizarSessao }), [sessao, atualizarSessao]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
