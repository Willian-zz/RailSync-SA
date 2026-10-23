import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  ArrowRight,
  Clock3,
  MapPin,
  RefreshCw,
  Search,
  TrainFront,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDadosAtualizados } from "@/hooks/use-dados-atualizados";
import { normalizarBusca } from "@/lib/busca";
import { pesquisarLinha } from "./linhas-busca";
import { AvisoErro } from "@/components/aviso-erro";
import { ProximaSaida } from "@/components/proxima-saida";
import { Seletor } from "@/components/seletor-campo";
import { Sentido } from "@/components/sentido-rota";
import { Situacao } from "@/components/situacao";

export default function LinhasConsulta() {
  const { dados, erro, carregando, atualizar } =
    useDadosAtualizados("/rede/consulta");
  const location = useLocation();
  const [pesquisa, setPesquisa] = useState("");
  const [termo, setTermo] = useState("");
  const [modo, setModo] = useState("tudo");
  const [situacao, setSituacao] = useState("");
  const [rotaId, setRotaId] = useState("");
  const [abertos, setAbertos] = useState([]);
  const modos = {
    tudo: "Tudo",
    linha: "Linha",
    rota: "Rota / sentido",
    trem: "Trem",
  };
  const linhas = (dados?.linhas || [])
    .filter((l) => {
      if (
        (situacao && l.situacao !== situacao) ||
        (rotaId && String(l.rota_id) !== rotaId)
      )
        return false;
      if (modo === "tudo") return pesquisarLinha(l, termo);
      const texto =
        modo === "linha"
          ? l.nome
          : modo === "trem"
            ? l.trens.map((t) => t.prefixo).join(" ")
            : [l.rota?.nome, l.rota?.origem, l.rota?.destino].join(" ");
      return normalizarBusca(texto).includes(normalizarBusca(termo));
    })
    .sort((a, b) => {
      const chave = (l) =>
        l.proxima_saida
          ? `${l.proxima_saida.data}T${l.proxima_saida.horario}`
          : "z";
      return chave(a).localeCompare(chave(b)) || a.nome.localeCompare(b.nome);
    });
  function alternar(id) {
    setAbertos((antes) =>
      antes.includes(id) ? antes.filter((i) => i !== id) : [...antes, id],
    );
  }
  const atualizacao = dados
    ? new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(dados.atualizado_em))
    : null;
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-6 py-4 sm:p-6">
      {location.state?.semPermissao && (
        <p role="status" className="rounded-lg border bg-muted p-3 text-sm">
          {location.state.mensagemPermissao ||
            "Seu perfil tem acesso à consulta de linhas. As áreas de gerenciamento são reservadas à operação."}
        </p>
      )}
      <section className="relative min-w-0 overflow-hidden rounded-2xl border bg-muted/30 p-5 text-left sm:p-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs font-medium">
          <TrainFront className="size-4" />
          Sua próxima viagem
        </div>
        <h1 className="!m-0 max-w-2xl !text-3xl !leading-tight !tracking-tight sm:!text-4xl">
          Encontre sua linha.
          <br />
          <span className="text-muted-foreground">Escolha o seu caminho.</span>
        </h1>
        <p className="mt-4 max-w-xl text-sm text-muted-foreground">
          Pesquise uma linha, o sentido da rota ou o prefixo do trem. Veja os
          horários e a disponibilidade para planejar sua saída.
        </p>
        <form
          role="search"
          className="mt-6 flex min-w-0 flex-col gap-3 rounded-xl border bg-background p-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            setTermo(pesquisa.trim());
          }}
        >
          <label className="flex min-w-0 flex-1 items-center gap-2">
            <Search className="ml-1 size-5 shrink-0 text-muted-foreground" />
            <span className="sr-only">Buscar linha, rota ou trem</span>
            <Input
              type="search"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              placeholder="Para onde você quer ir?"
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
          </label>
          <Button type="submit">
            Buscar viagens
            <ArrowRight className="size-4" />
          </Button>
        </form>
        <div
          className="mt-3 flex flex-wrap gap-2"
          role="group"
          aria-label="Pesquisar por"
        >
          {Object.entries(modos).map(([v, label]) => (
            <Button
              key={v}
              size="sm"
              variant={modo === v ? "default" : "outline"}
              aria-pressed={modo === v}
              onClick={() => setModo(v)}
            >
              {label}
            </Button>
          ))}
        </div>
      </section>
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="text-left">
          <h2 className="!mb-1 text-xl font-semibold">
            Linhas e próximas saídas
          </h2>
          <p className="text-xs text-muted-foreground">
            Horários de Brasília · Saídas diárias
            {atualizacao ? ` · Atualizado às ${atualizacao}` : ""}
          </p>
        </div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:flex">
          <Seletor
            id="consulta-situacao"
            label="Disponibilidade"
            value={situacao}
            onChange={(e) => setSituacao(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="ativo">Ativas</option>
            <option value="manutencao">Manutenção</option>
            <option value="inativo">Inativas</option>
          </Seletor>
          <Button
            variant="outline"
            aria-label="Atualizar viagens"
            onClick={atualizar}
            disabled={carregando}
          >
            <RefreshCw
              className={`size-4 ${carregando ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>
      <Seletor
        id="consulta-rota"
        label="Filtrar por rota"
        value={rotaId}
        onChange={(e) => setRotaId(e.target.value)}
        className="sm:max-w-sm"
      >
        <option value="">Todas as rotas</option>
        {dados?.rotas.map((r) => (
          <option key={r.id} value={r.id}>
            {r.nome} · {r.origem} → {r.destino}
          </option>
        ))}
      </Seletor>
      <AvisoErro mensagem={erro} />
      {carregando && !dados && (
        <p role="status" className="p-8 text-muted-foreground">
          Buscando suas opções de viagem...
        </p>
      )}
      <p role="status" className="text-left text-sm text-muted-foreground">
        {linhas.length}{" "}
        {linhas.length === 1 ? "linha encontrada" : "linhas encontradas"}
        {termo ? ` para “${termo}”` : ""}
      </p>
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
        {linhas.map((l) => (
          <article
            key={l.id}
            className="min-w-0 overflow-hidden rounded-2xl border bg-card text-left shadow-sm"
          >
            <div className="flex min-w-0 flex-col gap-5 p-5">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <TrainFront className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold">{l.nome}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {l.rota?.nome || "Rota não atribuída"}
                    </p>
                  </div>
                </div>
                <Situacao valor={l.situacao} />
              </div>
              <div className="rounded-xl bg-muted/50 p-3 text-sm">
                <p className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3.5" />
                  Sentido da viagem
                </p>
                <div>
                  {l.rota ? (
                    <Sentido origem={l.rota.origem} destino={l.rota.destino} />
                  ) : (
                    "----"
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">
                    Próxima saída
                  </p>
                  <ProximaSaida saida={l.proxima_saida} />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  aria-expanded={abertos.includes(l.id)}
                  aria-controls={`viagens-${l.id}`}
                  onClick={() => alternar(l.id)}
                >
                  <Clock3 className="size-4" />
                  {abertos.includes(l.id) ? "Fechar horários" : "Ver horários"}
                </Button>
              </div>
            </div>
            {abertos.includes(l.id) && (
              <div
                id={`viagens-${l.id}`}
                className="min-w-0 space-y-4 border-t bg-muted/20 p-5"
              >
                {l.trens.map((t) => (
                  <section key={t.id} className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{t.prefixo}</span>
                      <Situacao valor={t.situacao} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {l.horarios
                        .filter((h) => h.trem_id === t.id)
                        .map((h) => (
                          <span
                            key={h.id}
                            className="rounded-lg border bg-background px-2.5 py-1 text-xs tabular-nums"
                          >
                            {h.horario}
                          </span>
                        ))}
                      {!l.horarios.some((h) => h.trem_id === t.id) && (
                        <span className="text-xs text-muted-foreground">
                          Sem horários cadastrados.
                        </span>
                      )}
                    </div>
                  </section>
                ))}
                {!l.trens.length && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum trem atribuído a esta linha.
                  </p>
                )}
                {l.situacao !== "ativo" && (
                  <p className="text-xs text-muted-foreground">
                    Serviço indisponível no momento. Os horários acima
                    representam a programação cadastrada.
                  </p>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
      {!carregando && !linhas.length && (
        <div className="rounded-2xl border border-dashed p-8">
          <Search className="mx-auto mb-3 size-7 text-muted-foreground" />
          <h3 className="font-medium">Nenhuma linha encontrada</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Tente outro nome, sentido ou prefixo de trem e confira os filtros
            selecionados.
          </p>
        </div>
      )}
    </div>
  );
}
