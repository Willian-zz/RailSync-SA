import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
export function RotaPublica() {
  const { carregando, usuario } = useAuth();
  if (carregando) return <p role="status">Verificando sessão...</p>;
  return usuario ? <Navigate to="/index" replace /> : <Outlet />;
}
