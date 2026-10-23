import { Cpu, TrainTrack, TramFront, Route, Search, Users } from 'lucide-react';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { SidebarLabel } from '@/components/sidebar-label';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { NotificacoesSidebar } from '@/components/notificacoes/notificacoes-sidebar';

export function AppSidebar({ onLogout, ...props }) {
  const { usuario } = useAuth();
  if (!usuario) return null;
  const operacional = ['operario', 'dev'].includes(usuario.cargo);
  const iniciais = usuario.name.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase();
  const items = [
    { id: 'viajar', title: 'Viajar', icon: <Search />, isActive: true, items: [{ title: 'Consultar linhas', url: '/index/linhas' }] },
    ...(operacional ? [
      { id: 'trens', title: 'Trens', icon: <TramFront />, isActive: true, items: [
        { title: 'Leituras', url: '/index/trensLeituras' }, { title: 'Gerenciamento', url: '/index/trensGerenciamento' },
      ] },
      { id: 'rotas', title: 'Rotas', icon: <Route />, isActive: true, items: [{ title: 'Gerenciamento', url: '/index/rotasGerenciamento' }] },
      { id: 'linhas', title: 'Linhas', icon: <TrainTrack />, isActive: true, items: [{ title: 'Gerenciamento', url: '/index/linhasGerenciamento' }] },
      { id: 'sensores', title: 'Sensores', icon: <Cpu />, items: [{ title: 'Gerenciamento', url: '/index/sensoresGerenciamento' }] },
    ] : []),
    ...(usuario.cargo === 'dev' ? [
      { id: 'usuarios', title: 'Usuários', icon: <Users />, items: [{ title: 'Gerenciamento', url: '/index/usuariosGerenciamento' }] },
    ] : []),
  ];
  const cargos = { usuario: 'Usuário', operario: 'Operário', dev: 'Dev' };
  return <Sidebar collapsible="icon" {...props}>
    <SidebarHeader><SidebarLabel /></SidebarHeader>
    <SidebarContent><NavMain items={items} /></SidebarContent>
    <SidebarFooter>
      {operacional && <NotificacoesSidebar key={usuario.id} />}
      <p className="px-2 text-left text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">{cargos[usuario.cargo]}</p>
      <NavUser user={{ name: usuario.name, email: usuario.email, avatar: '', shortening: iniciais }} onLogout={onLogout} />
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>;
}
