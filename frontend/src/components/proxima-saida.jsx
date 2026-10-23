import { Clock3 } from 'lucide-react';

export function ProximaSaida({ saida }) {
  if (!saida) {
    return <div><span>----</span><p className="mt-1 text-xs text-muted-foreground">Sem saída disponível</p></div>;
  }

  return (
    <div className="space-y-1">
      <div className="inline-flex items-center gap-1.5 font-medium tabular-nums">
        <Clock3 className="size-3.5" />{saida.horario}
        {saida.amanha && <span className="text-xs font-normal text-muted-foreground">amanhã</span>}
      </div>
      <p className="text-xs text-muted-foreground">{saida.prefixo} · {saida.linha_nome}</p>
    </div>
  );
}
