import { useState } from "react";
import {
  CartesianGrid, Legend, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { tiposLeituras, formatarData, formatarNumero } from "@/lib/leituras";

const cores = ["#2563eb", "#0d9488", "#7c3aed", "#d97706", "#475569", "#db2777"];
const formatoEixo = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
});

function nomeTipo(tipo) {
  return tiposLeituras.find((item) => item.tipo === tipo)?.label || tipo;
}

// Une somente os horários registrados. Campos ausentes ficam nulos, nunca viram zero.
// Leituras repetidas no mesmo instante também são preservadas.
function dadosDoGrafico(sensores) {
  const horarios = new Map();
  for (const sensor of sensores) {
    for (const ponto of sensor.pontos) {
      const instante = Date.parse(ponto.registrada_em);
      if (!Number.isFinite(instante)) continue;
      if (!horarios.has(instante)) horarios.set(instante, new Map());
      const grupo = horarios.get(instante);
      if (!grupo.has(sensor.id)) grupo.set(sensor.id, []);
      grupo.get(sensor.id).push(ponto.valor);
    }
  }

  return [...horarios.entries()].sort(([a], [b]) => a - b).flatMap(([instante, grupo]) => {
    const quantidade = Math.max(...[...grupo.values()].map((valores) => valores.length));
    return Array.from({ length: quantidade }, (_, indice) => ({
      instante,
      ...Object.fromEntries(sensores.map((sensor) => [
        `sensor_${sensor.id}`, grupo.get(sensor.id)?.[indice] ?? null,
      ])),
    }));
  });
}

function GraficoSensores({ sensores, selecionadaEm, titulo }) {
  const dados = dadosDoGrafico(sensores);
  const unidade = sensores[0].unidade;
  const minimo = sensores[0].limite_minimo;
  const maximo = sensores[0].limite_maximo;
  const inicio = dados[0]?.instante;
  const fim = dados.at(-1)?.instante;
  const selecionada = Date.parse(selecionadaEm);
  const dominio = inicio === fim ? [inicio - 1000, fim + 1000] : ["dataMin", "dataMax"];
  const quantidade = sensores.reduce((total, sensor) => total + sensor.pontos.length, 0);

  return (
    <section className="min-w-0 rounded-lg border p-4 text-left">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{titulo}</h3>
          <p className="text-xs text-muted-foreground">{unidade || "Sem unidade"} · {quantidade} registros</p>
        </div>
        <div className="text-xs text-muted-foreground">
          Mínimo: {formatarNumero(minimo, unidade)} · Máximo: {formatarNumero(maximo, unidade)}
        </div>
      </div>

      {dados.length === 0 ? (
        <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Nenhuma leitura registrada para este sensor.
        </p>
      ) : (
        <>
          <div className="h-72 min-w-0" role="img" aria-label={`Histórico de ${titulo}: ${quantidade} registros do banco`}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={dados} margin={{ top: 20, right: 20, left: 4, bottom: 20 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="instante" type="number" scale="time" domain={dominio}
                  tickFormatter={(valor) => formatoEixo.format(new Date(valor))}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  minTickGap={45} tickMargin={10}
                />
                <YAxis
                  domain={["auto", "auto"]} width={65}
                  tickFormatter={(valor) => formatarNumero(valor)}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <Tooltip
                  labelFormatter={(valor) => formatarData(new Date(Number(valor)).toISOString())}
                  formatter={(valor, nome) => [formatarNumero(valor, unidade), nome]}
                  contentStyle={{ background: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "var(--popover-foreground)" }}
                  isAnimationActive={false}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                {minimo !== null && (
                  <ReferenceLine y={minimo} stroke="var(--destructive)" strokeDasharray="5 4" ifOverflow="extendDomain" label={{ value: "Mínimo", fill: "var(--destructive)", fontSize: 10, position: "insideBottomRight" }} />
                )}
                {maximo !== null && (
                  <ReferenceLine y={maximo} stroke="var(--destructive)" strokeDasharray="5 4" ifOverflow="extendDomain" label={{ value: "Máximo", fill: "var(--destructive)", fontSize: 10, position: "insideTopRight" }} />
                )}
                {selecionada >= inicio && selecionada <= fim && (
                  <ReferenceLine x={selecionada} stroke="var(--muted-foreground)" strokeDasharray="3 3" />
                )}
                {sensores.map((sensor, indice) => (
                  <Line
                    key={sensor.id} type="linear" dataKey={`sensor_${sensor.id}`} name={sensor.codigo}
                    stroke={cores[indice % cores.length]} strokeWidth={2}
                    dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          {inicio === fim && (
            <p className="mt-2 text-xs text-muted-foreground">
              Há registros em um único instante. A variação temporal aparecerá quando houver novos horários registrados.
            </p>
          )}
        </>
      )}
    </section>
  );
}

export default function TrensLeituraGraficos({ sensores, selecionadaEm }) {
  const [modo, setModo] = useState("trem");
  const grupos = new Map();
  for (const sensor of sensores) {
    const chave = `${sensor.tipo}:${sensor.unidade}`;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(sensor);
  }

  const graficos = modo === "sensor"
    ? sensores.map((sensor) => ({ chave: sensor.id, sensores: [sensor], titulo: `${sensor.codigo} · ${nomeTipo(sensor.tipo)}` }))
    : [...grupos.entries()].map(([chave, grupo]) => ({ chave, sensores: grupo, titulo: nomeTipo(grupo[0].tipo) }));

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-left">
          <h2 className="text-lg font-semibold">Histórico do trem</h2>
          <p className="text-sm text-muted-foreground">
            Pontos registrados no banco. A linha vertical marca o horário da leitura selecionada.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Visualização do histórico">
          <Button variant={modo === "trem" ? "default" : "outline"} aria-pressed={modo === "trem"} onClick={() => setModo("trem")}>Visão do trem</Button>
          <Button variant={modo === "sensor" ? "default" : "outline"} aria-pressed={modo === "sensor"} onClick={() => setModo("sensor")}>Por sensor</Button>
        </div>
      </div>
      <p className="text-left text-xs text-muted-foreground">
        Cada gráfico usa uma única unidade. As linhas conectam amostras existentes; campos sem dados
        não são preenchidos. As linhas vermelhas indicam os limites atuais configurados.
      </p>
      {graficos.length === 0 ? (
        <p className="rounded-md border p-6 text-sm text-muted-foreground">Nenhum sensor associado ao trem.</p>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
          {graficos.map((grafico) => (
            <GraficoSensores key={`${modo}:${grafico.chave}`} {...grafico} selecionadaEm={selecionadaEm} />
          ))}
        </div>
      )}
    </section>
  );
}
