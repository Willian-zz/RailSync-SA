import { Link } from 'react-router-dom';
import { AlertTriangle, Bell, CheckCheck, CircleCheck, RefreshCw, Wrench } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { useNotificacoes } from '@/hooks/use-notificacoes';

function formatarData(data) {
  const valor = new Date(data);
  if (!Number.isFinite(valor.getTime())) return 'Data indisponível';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(valor);
}

export function NotificacoesSidebar() {
  const { isMobile, setOpenMobile } = useSidebar();
  const { dados, erro, carregando, atualizar, marcarLida, marcarTodas } = useNotificacoes();
  const total = dados?.total_nao_lidas || 0;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu onOpenChange={aberto => { if (aberto) atualizar(); }}>
          <DropdownMenuTrigger render={<SidebarMenuButton tooltip="Notificações" aria-label={`Notificações, ${total} não lidas`} />}>
            <Bell />
            <span>Notificações</span>
            {total > 0 && <span className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-white group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:right-0 group-data-[collapsible=icon]:top-0 group-data-[collapsible=icon]:px-1">{total > 99 ? '99+' : total}</span>}
          </DropdownMenuTrigger>
          <DropdownMenuContent side={isMobile ? 'bottom' : 'right'} align="end" sideOffset={8} className="max-h-[70svh] w-96 max-w-[calc(100vw-2rem)]">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <span className="block text-sm font-semibold text-foreground">Notificações</span>
                <span className="mt-1 block font-normal">{total} não lidas · Alertas da operação</span>
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={marcarTodas} disabled={!total}><CheckCheck />Marcar todas como lidas</DropdownMenuItem>
              <DropdownMenuItem onClick={atualizar} disabled={carregando}><RefreshCw className={carregando ? 'animate-spin' : ''} />Atualizar notificações</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {erro && <p role="alert" className="px-3 py-2 text-sm text-destructive">{erro}</p>}
            {carregando && !dados && <p role="status" className="px-3 py-4 text-sm text-muted-foreground">Carregando notificações...</p>}
            {dados?.notificacoes.map(notificacao => {
              const Icone = notificacao.tipo === 'sensor_limite' ? AlertTriangle : notificacao.tipo === 'manutencao_entrada' ? Wrench : CircleCheck;

              return (
                <DropdownMenuItem key={notificacao.id} render={<Link to={notificacao.destino} />} onClick={() => { marcarLida(notificacao.id); if (isMobile) setOpenMobile(false); }} className="items-start gap-3 whitespace-normal py-3">
                  <Icone className={`mt-0.5 size-4 shrink-0 ${notificacao.tipo === 'sensor_limite' ? 'text-destructive' : 'text-muted-foreground'}`} />
                  <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                    <span className={`block text-sm ${notificacao.lida ? 'font-normal' : 'font-semibold'}`}>{notificacao.titulo}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{notificacao.descricao}</span>
                    <time dateTime={notificacao.ocorrida_em} className="mt-2 block text-xs text-muted-foreground">{formatarData(notificacao.ocorrida_em)}</time>
                  </span>
                  {!notificacao.lida && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-destructive"><span className="sr-only">Não lida</span></span>}
                </DropdownMenuItem>
              );
            })}
            {dados && !dados.notificacoes.length && <p className="px-3 py-5 text-sm text-muted-foreground">Nenhum alerta registrado. Novas ocorrências aparecerão aqui.</p>}
            <p className="border-t px-3 py-2 text-xs text-muted-foreground">Últimas 50 ocorrências. Atualização automática a cada 10 segundos.</p>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
