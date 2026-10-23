import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
} from "@/components/ui/menubar";
import { AvisoErro } from "@/components/aviso-erro";
import { ProximaSaida } from "@/components/proxima-saida";
import { Sentido } from "@/components/sentido-rota";
import { Situacao } from "@/components/situacao";
import { LinhasTrens } from "../linhas/linhas-trens";
import { useDadosAtualizados } from "@/hooks/use-dados-atualizados";
import { api } from "@/lib/api";
import { normalizarBusca } from "@/lib/busca";

const nomesSituacoes = {
  ativo: "Ativos",
  manutencao: "Em manutenção",
  inativo: "Inativos",
};

export default function RotasGerenciamento() {
  const { dados, erro, carregando, atualizar } =
    useDadosAtualizados("/rede/rotas");
  const [pesquisa, setPesquisa] = useState("");
  const [termo, setTermo] = useState("");
  const [status, setStatus] = useState("");
  const [abertos, setAbertos] = useState([]);
  const [erroAcao, setErroAcao] = useState("");
  const [excluindo, setExcluindo] = useState(null);

  const rotas = (dados || []).filter((rota) => {
    const texto = [
      rota.nome,
      rota.origem,
      rota.destino,
      ...rota.linhas.flatMap((linha) => [
        linha.nome,
        ...linha.trens.map((trem) => trem.prefixo),
      ]),
    ].join(" ");

    return (
      (!status || rota.situacao === status) &&
      normalizarBusca(texto).includes(normalizarBusca(termo))
    );
  });

  function alternar(id) {
    setAbertos((atuais) =>
      atuais.includes(id)
        ? atuais.filter((valor) => valor !== id)
        : [...atuais, id],
    );
  }

  async function excluir(rota) {
    if (!window.confirm(`Excluir ${rota.nome}? As linhas serão desvinculadas.`))
      return;
    setExcluindo(rota.id);
    setErroAcao("");

    try {
      await api(`/rede/rotas/${rota.id}`, { method: "DELETE" });
      atualizar();
    } catch (error) {
      setErroAcao(error.message);
    } finally {
      setExcluindo(null);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Gerenciamento de rotas
        </h1>
        <p className="text-sm text-muted-foreground">
          Consulte a operação, organize atribuições e acompanhe as próximas
          saídas.
        </p>
      </div>
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form
          className="w-full min-w-0 lg:max-w-md"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            setTermo(pesquisa.trim());
          }}
        >
          <ButtonGroup className="w-full min-w-0">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Input
                aria-label="Pesquisar rotas"
                placeholder="Rota, sentido, linha ou trem"
                value={pesquisa}
                onChange={(event) => setPesquisa(event.target.value)}
                className="border-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <Button variant="ghost" type="submit">
              Pesquisar
            </Button>
          </ButtonGroup>
        </form>
        <div className="flex flex-wrap gap-2">
          <Menubar>
            <MenubarMenu>
              <MenubarTrigger>
                {status ? nomesSituacoes[status] : "Situação"}
              </MenubarTrigger>
              <MenubarContent>
                <MenubarItem onClick={() => setStatus("")}>
                  Todas as situações
                </MenubarItem>
                {Object.entries(nomesSituacoes).map(([valor, nome]) => (
                  <MenubarItem key={valor} onClick={() => setStatus(valor)}>
                    {nome}
                  </MenubarItem>
                ))}
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
          <Button
            variant="outline"
            onClick={atualizar}
            disabled={carregando}
            aria-label="Atualizar lista"
          >
            <RefreshCw
              className={`size-4 ${carregando ? "animate-spin" : ""}`}
            />
          </Button>
          <Button render={<Link to="/index/rotasGerenciamento/novo" />}>
            <Plus className="size-4" />
            Nova rota
          </Button>
        </div>
      </div>
      <AvisoErro mensagem={erroAcao || erro} />
      <div
        className="min-w-0 overflow-hidden rounded-md border"
        aria-busy={carregando}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <span className="sr-only">Detalhes</span>
              </TableHead>
              <TableHead className="text-center">Rota / sentido</TableHead>
              <TableHead className="text-center">Situação</TableHead>
              <TableHead className="text-center">Trens atribuídos</TableHead>
              <TableHead className="text-center">Próxima saída</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rotas.map((rota) => (
              <Fragment key={rota.id}>
                <TableRow
                  className="cursor-pointer"
                  onClick={() => alternar(rota.id)}
                >
                  <TableCell>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Detalhes de ${rota.nome}`}
                      aria-expanded={abertos.includes(rota.id)}
                      aria-controls={`detalhes-rotas-${rota.id}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        alternar(rota.id);
                      }}
                    >
                      <ChevronDown
                        className={`size-4 transition-transform ${abertos.includes(rota.id) ? "rotate-180" : ""}`}
                      />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{rota.nome}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <Sentido origem={rota.origem} destino={rota.destino} />
                    </p>
                  </TableCell>
                  <TableCell>
                    <Situacao valor={rota.situacao} />
                    {rota.situacao === "ativo" && (
                      <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                        {rota.linhas
                          .filter((linha) => linha.situacao === "ativo")
                          .flatMap((linha) =>
                            linha.trens
                              .filter((trem) => trem.situacao === "ativo")
                              .map((trem) => (
                                <p key={`${linha.id}-${trem.id}`}>
                                  {linha.nome} · {trem.prefixo}
                                </p>
                              )),
                          )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {rota.linhas
                      .flatMap((linha) => linha.trens)
                      .map((trem) => trem.prefixo)
                      .join(", ") || "----"}
                  </TableCell>
                  <TableCell>
                    <ProximaSaida saida={rota.proxima_saida} />
                  </TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Ações de ${rota.nome}`}
                            disabled={excluindo === rota.id}
                          />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          render={
                            <Link
                              to={`/index/rotasGerenciamento/editar/${rota.id}`}
                            />
                          }
                        >
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => excluir(rota)}
                          className="text-destructive"
                        >
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                {abertos.includes(rota.id) && (
                  <TableRow
                    id={`detalhes-rotas-${rota.id}`}
                    className="bg-muted/30 hover:bg-muted/30"
                  >
                    <TableCell colSpan={6} className="whitespace-normal p-0">
                      <div className="flex min-w-0 flex-col gap-4 p-4 text-left">
                        {rota.linhas.map((linha) => (
                          <section key={linha.id} className="min-w-0 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold">{linha.nome}</h3>
                              <Situacao valor={linha.situacao} />
                            </div>
                            <LinhasTrens linha={linha} />
                          </section>
                        ))}
                        {!rota.linhas.length && (
                          <p className="text-sm text-muted-foreground">
                            Nenhuma linha atribuída a esta rota.
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Horários diários de Brasília. Saídas de serviços em
                          manutenção ou inativos ficam indisponíveis.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
            {!rotas.length && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  {carregando
                    ? "Carregando..."
                    : "Nenhum registro encontrado com esses critérios."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
        {Object.entries(nomesSituacoes).map(([valor, nome]) => (
          <div key={valor} className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{nome}</p>
            <p className="text-2xl font-bold">
              {(dados || []).filter((rota) => rota.situacao === valor).length}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        A situação considera o cadastro, as linhas e os trens disponíveis.
        Próximas saídas em horário de Brasília; atualização automática a cada
        minuto.
      </p>
    </div>
  );
}
