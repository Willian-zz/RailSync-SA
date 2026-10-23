import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CircleCheck } from 'lucide-react';

// Uma cor fixa por tipo mantém a legenda consistente ao mudar o escopo.
const cores = {
  velocidade: '#2563eb', temperatura: '#ea580c', consumo: '#0d9488',
  vibracao: '#9333ea', capacidade: '#d97706',
};
const numero = valor => new Intl.NumberFormat('pt-BR').format(valor);

export default function InicioErrosGrafico({ tipos, total, leiturasConsideradas }) {
  const fatias = tipos.filter(tipo => tipo.quantidade > 0);
  const descricao = tipos.map(tipo => `${tipo.nome}: ${numero(tipo.quantidade)}`).join('; ');

  return (
    <div className="grid min-w-0 items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {total > 0 ? (
        <div className="h-72 min-w-0 sm:h-80" role="img" aria-label={`Gráfico de pizza com ${numero(total)} erros. ${descricao}`}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart>
              <Pie data={fatias} dataKey="quantidade" nameKey="nome" cx="50%" cy="50%" outerRadius="85%" stroke="var(--card)" strokeWidth={3} isAnimationActive={false}>
                {fatias.map(tipo => <Cell key={tipo.tipo} fill={cores[tipo.tipo]} />)}
              </Pie>
              <Tooltip
                formatter={(valor, nome) => [`${numero(valor)} ${Number(valor) === 1 ? 'erro' : 'erros'}`, nome]}
                contentStyle={{ background: 'var(--popover)', color: 'var(--popover-foreground)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 13 }}
                itemStyle={{ color: 'var(--popover-foreground)' }}
                isAnimationActive={false}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex min-h-64 min-w-0 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 p-6 text-center">
          <CircleCheck className="size-9 text-muted-foreground" />
          <p className="font-medium">{leiturasConsideradas ? 'Nenhum erro nas leituras consideradas' : 'Nenhuma leitura registrada'}</p>
          <p className="max-w-xs text-sm text-muted-foreground">O gráfico será exibido quando houver medições fora dos limites configurados.</p>
        </div>
      )}
      <div className="min-w-0 text-left">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Total de erros</p>
        <p className="mb-5 text-4xl font-semibold tabular-nums">{numero(total)}</p>
        <ul aria-label="Legenda dos erros" className="space-y-3">
          {tipos.map(tipo => (
            <li key={tipo.tipo} className="flex min-w-0 items-center gap-3 rounded-lg border px-3 py-2.5 text-sm">
              <span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ backgroundColor: cores[tipo.tipo] }} />
              <span className="min-w-0 flex-1">{tipo.nome}</span>
              <span className="shrink-0 font-semibold tabular-nums">{numero(tipo.quantidade)} {tipo.quantidade === 1 ? 'erro' : 'erros'}</span>
              <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{total ? new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(tipo.quantidade / total * 100) : '0'}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
