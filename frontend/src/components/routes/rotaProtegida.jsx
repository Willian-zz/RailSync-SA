import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
export function RotaProtegida() {
  const { carregando, usuario } = useAuth();
  if (carregando) return <p role="status">Verificando sessão...</p>;
  return usuario ? <Outlet /> : <Navigate to="/login" replace />;
}
export function RotaCargo({ cargos }) {
  const { usuario } = useAuth();
  return usuario && (usuario.cargo === 'dev' || cargos.includes(usuario.cargo))
    ? <Outlet /> : <Navigate to="/index/linhas" replace state={{
      semPermissao: true,
      mensagemPermissao: cargos.includes('dev') ? 'Esta área está disponível apenas para devs.' : undefined,
    }} />;
}
