import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
export function RotaInicial() {
  const { carregando, usuario } = useAuth();
  if (carregando) return <p role="status">Verificando sessão...</p>;
  return <Navigate to={usuario ? '/index' : '/login'} replace />;
}
