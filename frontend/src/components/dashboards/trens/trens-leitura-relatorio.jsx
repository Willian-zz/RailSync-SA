import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangleIcon, ArrowLeftIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { tiposLeituras, formatarData, formatarNumero } from "@/lib/leituras";
import TrensLeituraGraficos from "./trens-leitura-graficos";

function padraoEsperado(medicao) {
  if (!medicao.limite_configurado) return "Sem limite nesta unidade";
  const { limite_minimo: minimo, limite_maximo: maximo, unidade } = medicao;
  if (minimo !== null && maximo !== null) {
    return `Entre ${formatarNumero(minimo)} e ${formatarNumero(maximo, unidade)} (inclusive)`;
  }
  return minimo !== null
    ? `A partir de ${formatarNumero(minimo, unidade)}`
    : `Até ${formatarNumero(maximo, unidade)}`;
}

function diferencaDoLimite(medicao) {
  if (medicao.diferenca === null) return "----";
  if (!medicao.em_erro) return "0 — dentro do intervalo";
  return `${formatarNumero(medicao.diferenca, medicao.unidade)} ${
    medicao.direcao === "acima" ? "acima do máximo" : "abaixo do mínimo"
  }`;
}

export default function TrensLeituraRelatorio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [atualizacao, setAtualizacao] = useState(0);
  const [estado, setEstado] = useState({ id: null, dados: null, carregando: true, erro: "" });

  useEffect(() => {
    const controller = new AbortController();
    async function carregarRelatorio() {
      try {
        const resposta = await fetch(`http://localhost:3000/api/stmt/readings/${encodeURIComponent(id)}/report`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados?.message || "Não foi possível carregar o relatório.");
        if (!controller.signal.aborted) setEstado({ id, dados, carregando: false, erro: "" });
      } catch (error) {
        if (!controller.signal.aborted) {
          setEstado((anterior) => ({
            id,
            dados: anterior.id === id ? anterior.dados : null,
            carregando: false,
            erro: error.message === "Failed to fetch"
              ? "Não foi possível conectar ao servidor. Tente novamente." : error.message,
          }));
        }
      }
    }
    carregarRelatorio();
    return () => controller.abort();
  }, [id, atualizacao]);

  function atualizarRelatorio() {
    setEstado((anterior) => ({ ...anterior, carregando: true, erro: "" }));
    setAtualizacao((anterior) => anterior + 1);
  }

  const carregando = estado.carregando || estado.id !== id;
  const relatorio = estado.id === id ? estado.dados : null;
  const erro = estado.id === id ? estado.erro : "";
  const faltantes = relatorio ? tiposLeituras.filter((tipo) => !relatorio.leitura.medicoes[tipo.tipo].length) : [];

  return (
    <div className="flex min-w-0 flex-col gap-6 sm:p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Relatório da leitura</h1>
        <p className="text-sm text-muted-foreground">
          Confira os valores registrados, os desvios dos limites e o histórico dos sensores.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onClick={() => navigate("/index/trensLeituras")}>
          <ArrowLeftIcon className="size-4" aria-hidden="true" /> Voltar às leituras
        </Button>
        <Button onClick={atualizarRelatorio} disabled={carregando}>
          <RefreshCwIcon className={`size-4 ${carregando ? "animate-spin" : ""}`} aria-hidden="true" />
          {carregando ? "Atualizando..." : "Atualizar relatório"}
        </Button>
      </div>

      {erro && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {erro}
          <Button variant="link" onClick={atualizarRelatorio}>Tentar novamente</Button>
        </div>
      )}
      {carregando && !relatorio && <p role="status" className="p-6 text-muted-foreground">Carregando relatório...</p>}

      {relatorio && (
        <>
          <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Trem</p>
              <p className="font-semibold">{relatorio.trem.prefixo}</p>
              <p className="text-xs text-muted-foreground">{relatorio.trem.modelo}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Horário da leitura</p>
              <p className="font-medium">{formatarData(relatorio.leitura.registrada_em)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Situação</p>
              <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                relatorio.leitura.em_erro ? "bg-destructive/10 text-destructive" : "bg-muted"
              }`}>
                {relatorio.leitura.em_erro && <AlertTriangleIcon className="size-3.5" aria-hidden="true" />}
                {relatorio.leitura.em_erro ? "Com erro" : "Dentro dos limites"}
              </span>
              <p className="mt-1 text-xs text-muted-foreground">{relatorio.leitura.alertas.length} desvios identificados</p>
            </div>
          </div>

          {relatorio.leitura.sem_limite && (
            <p className="rounded-md border bg-muted/40 p-3 text-left text-sm" role="note">
              Avaliação parcial: há medições sem limites na mesma unidade do sensor. Elas não
              foram classificadas como erro nem confirmadas como dentro do intervalo. Configure
              os limites no gerenciamento do trem para avaliá-las.
            </p>
          )}

          <section className="flex min-w-0 flex-col gap-3">
            <div className="text-left">
              <h2 className="text-lg font-semibold">Valores e limites da leitura</h2>
              <p className="text-sm text-muted-foreground">
                A diferença indica quanto o valor ultrapassou o máximo ou ficou abaixo do mínimo.
              </p>
            </div>
            <div className="min-w-0 overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {["Sensor", "Medição", "Valor registrado", "Padrão esperado", "Mínimo", "Máximo", "Diferença", "Situação"].map((titulo) => (
                      <TableHead key={titulo} className="text-center">{titulo}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatorio.medicoes.map((medicao) => (
                    <TableRow key={medicao.id} className={medicao.em_erro ? "bg-destructive/5" : ""}>
                      <TableCell className="text-center font-medium">{medicao.sensor_codigo || "----"}</TableCell>
                      <TableCell className="text-center">{tiposLeituras.find((tipo) => tipo.tipo === medicao.tipo)?.label || medicao.tipo}</TableCell>
                      <TableCell className={`text-center font-medium ${medicao.em_erro ? "text-destructive" : ""}`}>{formatarNumero(medicao.valor, medicao.unidade)}</TableCell>
                      <TableCell className="text-center">{padraoEsperado(medicao)}</TableCell>
                      <TableCell className="text-center">{formatarNumero(medicao.limite_minimo, medicao.unidade)}</TableCell>
                      <TableCell className="text-center">{formatarNumero(medicao.limite_maximo, medicao.unidade)}</TableCell>
                      <TableCell className={`text-center ${medicao.em_erro ? "text-destructive" : "text-muted-foreground"}`}>{diferencaDoLimite(medicao)}</TableCell>
                      <TableCell className={`text-center ${medicao.em_erro ? "text-destructive" : ""}`}>
                        {medicao.valor === null ? "Sem valor" : !medicao.limite_configurado ? "Não avaliada" : medicao.em_erro ? "Com erro" : "Dentro dos limites"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {faltantes.map((tipo) => (
                    <TableRow key={tipo.tipo} className="text-muted-foreground">
                      <TableCell className="text-center">----</TableCell>
                      <TableCell className="text-center">{tipo.label}</TableCell>
                      {Array.from({ length: 5 }, (_, indice) => <TableCell key={indice} className="text-center">----</TableCell>)}
                      <TableCell className="text-center">Sem leitura neste horário</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-left text-xs text-muted-foreground">
              O padrão usa os limites atuais do trem, inclusive para leituras antigas. Não existe
              valor ideal presumido nem comparação entre unidades diferentes.
            </p>
          </section>

          <TrensLeituraGraficos sensores={relatorio.sensores} selecionadaEm={relatorio.leitura.registrada_em} />
          <p className="text-xs text-muted-foreground" role="status">
            Relatório atualizado em {formatarData(relatorio.gerado_em)}. Atualizar consulta novamente
            os limites e todo o histórico registrado, mantendo o horário da leitura selecionada.
          </p>
        </>
      )}
    </div>
  );
}
