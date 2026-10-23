import { fetchAutenticado } from "@/lib/api";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangleIcon, RefreshCwIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { tiposLeituras, formatarData, formatarNumero } from "@/lib/leituras";

function Medicoes({ medicoes = [] }) {
  if (medicoes.length === 0) return <span className="text-muted-foreground">----</span>;

  return (
    <div className="flex flex-col gap-2">
      {medicoes.map((medicao) => (
        <div key={medicao.id} className={medicao.em_erro ? "text-destructive" : ""}>
          <span className="inline-flex items-center gap-1 font-medium tabular-nums">
            {medicao.em_erro && <AlertTriangleIcon className="size-3.5" aria-label="Fora do limite" />}
            {formatarNumero(medicao.valor, medicao.unidade)}
          </span>
          <span className={`block text-xs ${medicao.em_erro ? "text-destructive" : "text-muted-foreground"}`}>
            {medicao.sensor_codigo || "----"}
          </span>
        </div>
      ))}
    </div>
  );
}

function SituacaoLeitura({ leitura }) {
  return (
    <Link
      to={`/index/trensLeituras/relatorio/${leitura.leitura_id}`}
      aria-label={`Ver relatório de ${leitura.prefixo} em ${formatarData(leitura.registrada_em)}`}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium outline-offset-4 hover:underline ${
        leitura.em_erro ? "bg-destructive/10 text-destructive" : "bg-muted"
      }`}
    >
      {leitura.em_erro && <AlertTriangleIcon className="size-3.5" aria-hidden="true" />}
      {leitura.em_erro ? "Com erro" : "Dentro dos limites"}
    </Link>
  );
}

export default function TrensLeituras() {
  const navigate = useNavigate();
  const [estado, setEstado] = useState({
    leituras: [],
    carregando: true,
    erro: "",
    atualizadaEm: null,
  });
  const [atualizacao, setAtualizacao] = useState(0);
  const [pesquisa, setPesquisa] = useState("");
  const [termoPesquisado, setTermoPesquisado] = useState("");
  const [filtroErro, setFiltroErro] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function buscarLeituras() {
      try {
        const resposta = await fetchAutenticado("http://localhost:3000/api/stmt/readings", {
          signal: controller.signal,
          cache: "no-store",
        });
        const dados = await resposta.json();

        if (!resposta.ok || !Array.isArray(dados)) {
          throw new Error(dados?.message || "Não foi possível carregar as leituras.");
        }

        if (!controller.signal.aborted) {
          setEstado({ leituras: dados, carregando: false, erro: "", atualizadaEm: new Date().toISOString() });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setEstado((anterior) => ({
            ...anterior,
            carregando: false,
            erro: error.message === "Failed to fetch"
              ? "Não foi possível carregar as leituras. Verifique o servidor."
              : error.message,
          }));
        }
      }
    }

    buscarLeituras();
    return () => controller.abort();
  }, [atualizacao]);

  function atualizarLeituras() {
    setEstado((anterior) => ({ ...anterior, carregando: true, erro: "" }));
    setAtualizacao((anterior) => anterior + 1);
  }

  function pesquisarTrens(event) {
    event.preventDefault();
    setTermoPesquisado(pesquisa.trim());
  }

  const { leituras, carregando, erro, atualizadaEm } = estado;
  const leiturasFiltradas = leituras.filter((leitura) => {
    const correspondePesquisa = leitura.prefixo.toLowerCase().includes(termoPesquisado.toLowerCase());
    const correspondeErro = !filtroErro || (
      filtroErro === "todos"
        ? leitura.em_erro
        : leitura.alertas.some((alerta) => alerta.tipo === filtroErro)
    );
    return correspondePesquisa && correspondeErro;
  });

  const nomeFiltro = filtroErro === "todos"
    ? "Apenas erros"
    : tiposLeituras.find((item) => item.tipo === filtroErro)?.label;

  return (
    <div className="flex min-w-0 flex-col gap-6 sm:p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Leituras de trens</h1>
        <p className="text-sm text-muted-foreground">
          Consulte as leituras dos sensores e os avisos de cada trem.
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form className="w-full min-w-0 lg:max-w-md" onSubmit={pesquisarTrens} role="search">
          <ButtonGroup className="w-full min-w-0">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border px-3">
              <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <Input
                aria-label="Pesquisar pelo prefixo do trem"
                placeholder="Digite o prefixo do trem"
                className="border-0 shadow-none focus-visible:ring-0"
                value={pesquisa}
                onChange={(event) => setPesquisa(event.target.value)}
              />
            </div>
            <Button type="submit" variant="ghost">Pesquisar</Button>
          </ButtonGroup>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <Menubar>
            <MenubarMenu>
              <MenubarTrigger>
                {nomeFiltro ? `Erros: ${nomeFiltro}` : "Erros"}
              </MenubarTrigger>
              <MenubarContent>
                <MenubarItem onClick={() => setFiltroErro("")}>Todas as leituras</MenubarItem>
                <MenubarItem onClick={() => setFiltroErro("todos")}>Apenas erros</MenubarItem>
                <MenubarSeparator />
                {tiposLeituras.map((item) => (
                  <MenubarItem key={item.tipo} onClick={() => setFiltroErro(item.tipo)}>
                    Erros de {item.label.toLowerCase()}
                  </MenubarItem>
                ))}
              </MenubarContent>
            </MenubarMenu>
          </Menubar>

          <Button onClick={atualizarLeituras} disabled={carregando}>
            <RefreshCwIcon className={`mr-2 size-4 ${carregando ? "animate-spin" : ""}`} aria-hidden="true" />
            {carregando ? "Atualizando..." : "Atualizar"}
          </Button>
        </div>
      </div>

      {erro && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {erro}
          <Button variant="link" size="sm" onClick={atualizarLeituras}>Tentar novamente</Button>
        </div>
      )}

      <div className="min-w-0 overflow-hidden rounded-md border" aria-busy={carregando}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Data e hora</TableHead>
              <TableHead className="text-center">Trem (prefixo)</TableHead>
              {tiposLeituras.map((item) => (
                <TableHead key={item.tipo} className="text-center">{item.label}</TableHead>
              ))}
              <TableHead className="text-center">Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carregando ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Carregando leituras...
                </TableCell>
              </TableRow>
            ) : leiturasFiltradas.length > 0 ? leiturasFiltradas.map((leitura) => (
              <TableRow
                key={leitura.id}
                className="cursor-pointer"
                onClick={(event) => {
                  if (!event.target.closest("a, button") && !window.getSelection()?.toString()) {
                    navigate(`/index/trensLeituras/relatorio/${leitura.leitura_id}`);
                  }
                }}
              >
                <TableCell className="text-center tabular-nums">{formatarData(leitura.registrada_em)}</TableCell>
                <TableCell className="text-center font-medium">{leitura.prefixo || "----"}</TableCell>
                {tiposLeituras.map((item) => (
                  <TableCell key={item.tipo} className="text-center">
                    <Medicoes medicoes={leitura.medicoes[item.tipo]} />
                  </TableCell>
                ))}
                <TableCell className="text-center"><SituacaoLeitura leitura={leitura} /></TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  {erro && !atualizadaEm
                    ? "Não foi possível carregar as leituras."
                    : termoPesquisado || filtroErro
                      ? "Nenhuma leitura encontrada com esses critérios."
                      : "Nenhuma leitura registrada."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:justify-between" role="status">
        <span>{leiturasFiltradas.length} de {leituras.length} registros</span>
        {atualizadaEm && <span>Última atualização: {formatarData(atualizadaEm)}</span>}
      </div>
      <p className="text-xs text-muted-foreground">
        Clique em uma leitura para ver o relatório e o histórico dos sensores, inclusive quando
        estiver dentro dos limites. Leituras sem limite na mesma unidade não geram avisos;
        a cobertura da avaliação é informada no relatório.
      </p>
    </div>
  );
}
