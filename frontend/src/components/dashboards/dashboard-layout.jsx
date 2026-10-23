import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CircleCheck,
  CirclePause,
  RefreshCw,
  ShieldAlert,
  TrainFront,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Seletor } from "@/components/seletor-campo";
import { AvisoErro } from "@/components/aviso-erro";
import { useDadosAtualizados } from "@/hooks/use-dados-atualizados";

const InicioErrosGrafico = lazy(() => import("./inicio/inicio-erros-grafico"));
const numero = (valor) =>
  typeof valor === "number"
    ? new Intl.NumberFormat("pt-BR").format(valor)
    : "----";

function formatarData(valor) {
  if (!valor) return "----";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(valor));
}

function Indicador({
  titulo,
  valor,
  descricao,
  icone,
  cor = "bg-muted text-muted-foreground",
}) {
  return (
    <article
      aria-label={titulo}
      className="min-w-0 rounded-xl border bg-card p-5 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="!m-0 !text-sm !font-medium !leading-normal !tracking-normal text-muted-foreground">
          {titulo}
        </h2>
        <span
          className={`hidden size-9 shrink-0 items-center justify-center rounded-lg sm:flex ${cor}`}
        >
          {icone}
        </span>
      </div>
      <p className="mt-4 text-4xl font-semibold tabular-nums">
        {numero(valor)}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">{descricao}</p>
    </article>
  );
}

export default function DashboardLayout() {
  const [escopo, setEscopo] = useState("historico");
  const { dados, erro, carregando, atualizar } = useDadosAtualizados(
    `/dashboard?escopo=${escopo}`,
  );
  // Ao alternar o escopo, não apresenta números da consulta anterior como novos.
  const resumo = dados?.escopo === escopo ? dados : null;
  const atualizando = carregando || (!resumo && !erro);
  const escopoDescricao =
    escopo === "historico"
      ? "Todo o histórico de leituras"
      : "Última leitura de cada sensor";

  return (
    <div className="flex min-w-0 flex-col gap-6 sm:p-6">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 text-left">
          <h1 className="text-2xl font-bold tracking-tight">
            Visão geral dos trens
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe a situação da frota e os erros registrados pelos sensores.
          </p>
        </div>
        <Button
          className="w-fit shrink-0"
          variant="outline"
          onClick={atualizar}
          disabled={atualizando}
        >
          <RefreshCw
            className={`size-4 ${atualizando ? "animate-spin" : ""}`}
          />
          Atualizar dashboard
        </Button>
      </div>
      <AvisoErro
        mensagem={
          erro === "Failed to fetch"
            ? "Não foi possível conectar ao servidor. Tente novamente."
            : erro
        }
      />
      <div
        className="grid min-w-0 grid-cols-1 gap-4 min-[380px]:grid-cols-2 xl:grid-cols-3"
        aria-busy={atualizando}
      >
        <Indicador
          titulo="Total de trens"
          valor={resumo?.trens.total}
          descricao="Todos os trens cadastrados"
          icone={<TrainFront className="size-4" />}
        />
        <Indicador
          titulo="Em funcionamento"
          valor={resumo?.trens.ativos}
          descricao="Trens com situação ativa no cadastro"
          icone={<CircleCheck className="size-4" />}
          cor="etiqueta-ativo"
        />
        <Indicador
          titulo="Em manutenção"
          valor={resumo?.trens.manutencao}
          descricao="Trens com situação de manutenção"
          icone={<Wrench className="size-4" />}
          cor="etiqueta-manutencao"
        />
        <Indicador
          titulo="Inativos"
          valor={resumo?.trens.inativos}
          descricao="Trens com situação inativa"
          icone={<CirclePause className="size-4" />}
          cor="etiqueta-inativo"
        />
        <Indicador
          titulo="Erros registrados"
          valor={resumo?.erros.total}
          descricao={escopoDescricao}
          icone={<AlertTriangle className="size-4" />}
          cor="bg-destructive/10 text-destructive"
        />
        <Indicador
          titulo="Trens com erros registrados"
          valor={resumo?.erros.trens_com_erro}
          descricao="Trens distintos nas leituras com erro selecionadas"
          icone={<ShieldAlert className="size-4" />}
          cor="bg-destructive/10 text-destructive"
        />
      </div>
      <section
        className="min-w-0 rounded-xl border bg-card p-4 sm:p-6"
        aria-labelledby="dashboard-erros-titulo"
        aria-busy={atualizando}
      >
        <div className="mb-6 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 text-left">
            <h2
              id="dashboard-erros-titulo"
              className="!mb-2 !text-xl !font-semibold"
            >
              Erros por tipo de medição
            </h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              Cada medição acima do máximo ou abaixo do mínimo conta como um
              erro. Um trem pode apresentar vários tipos.
            </p>
          </div>
          <Seletor
            id="dashboard-escopo"
            label="Leituras consideradas"
            value={escopo}
            onChange={(event) => setEscopo(event.target.value)}
            className="w-full lg:w-60 lg:shrink-0"
          >
            <option value="historico">Todo o histórico</option>
            <option value="atuais">Última de cada sensor</option>
          </Seletor>
        </div>
        {resumo ? (
          <Suspense
            fallback={
              <p role="status" className="py-16 text-sm text-muted-foreground">
                Carregando gráfico...
              </p>
            }
          >
            <InicioErrosGrafico
              tipos={resumo.erros.por_tipo}
              total={resumo.erros.total}
              leiturasConsideradas={resumo.erros.leituras_consideradas}
            />
          </Suspense>
        ) : (
          <p role="status" className="py-16 text-sm text-muted-foreground">
            {erro
              ? "Não foi possível carregar os indicadores. Tente atualizar novamente."
              : "Carregando indicadores..."}
          </p>
        )}
        {resumo && (
          <div className="mt-6 space-y-2 border-t pt-4 text-left text-xs text-muted-foreground">
            <p>
              {numero(resumo.erros.leituras_consideradas)} leituras consideradas
              · {numero(resumo.erros.leituras_sem_limite)} sem limite na mesma
              unidade, sem classificação de erro.
            </p>
            <p>
              Os limites atuais de cada trem são usados na avaliação. Capacidade
              representa a medição de carga já cadastrada nos sensores.
            </p>
          </div>
        )}
      </section>
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="space-y-1 text-left text-xs text-muted-foreground"
          role="status"
        >
          <p>
            Atualizado em {formatarData(resumo?.atualizado_em)} · Atualização
            automática a cada minuto.
          </p>
          <p>
            Última leitura considerada: {formatarData(resumo?.ultima_leitura)} ·
            Horário de Brasília.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            render={<Link to="/index/trensGerenciamento" />}
          >
            Gerenciar trens
            <ArrowRight className="size-4" />
          </Button>
          <Button render={<Link to="/index/trensLeituras" />}>
            Ver leituras
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
