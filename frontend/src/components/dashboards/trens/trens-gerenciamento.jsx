
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { MoreHorizontalIcon, SearchIcon, PlusIcon } from "lucide-react";

export default function TrensGerenciamento() {
  const navigate = useNavigate();

  const [trens, setTrens] = useState([]);
  const [situacoes, setSituacoes] = useState({});

  const [pesquisa, setPesquisa] = useState("");
  const [termoPesquisado, setTermoPesquisado] = useState("");

  const [filtroAno, setFiltroAno] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // Busca os trens cadastrados na API
  async function buscarTrens() {
    try {
      setCarregando(true);
      setErro("");

      const resposta = await fetch(
        "http://localhost:3000/api/stmt/trains"
      );

      if (!resposta.ok) {
        throw new Error("Não foi possível carregar os trens.");
      }

      const dados = await resposta.json();

      setTrens(dados);
    } catch (error) {
      console.error("Erro ao buscar trens:", error);
      setErro("Não foi possível carregar os trens. Verifique o servidor.");
    } finally {
      setCarregando(false);
    }
  }

  // Busca a quantidade de trens por situação
  async function buscarSituacoes() {
    try {
      const resposta = await fetch(
        "http://localhost:3000/api/stmt/trains/status"
      );

      if (!resposta.ok) {
        throw new Error("Não foi possível carregar as situações.");
      }

      const dados = await resposta.json();

      setSituacoes(dados);
    } catch (error) {
      console.error("Erro ao buscar situações:", error);
    }
  }

  useEffect(() => {
    buscarTrens();
    buscarSituacoes();
  }, []);

  // Executa a pesquisa ao clicar no botão ou pressionar Enter
  function pesquisarTrens() {
    setTermoPesquisado(pesquisa.trim());
  }

  // Exclui um trem do banco de dados
  async function excluirTrem(id) {
    const confirmar = window.confirm(
      "Tem certeza de que deseja excluir este trem?"
    );

    if (!confirmar) return;

    try {
      const resposta = await fetch(
        `http://localhost:3000/api/stmt/trains/${id}`,
        {
          method: "DELETE",
        }
      );

      const resultado = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        window.alert(
          resultado?.message || "Não foi possível excluir o trem."
        );
        return;
      }

      // Atualiza a tabela sem precisar recarregar a página
      setTrens((trensAtuais) =>
        trensAtuais.filter((trem) => trem.id !== id)
      );

      // Atualiza os números das situações
      buscarSituacoes();
    } catch (error) {
      console.error("Erro ao excluir trem:", error);
      window.alert("Não foi possível conectar ao servidor.");
    }
  }

  // Aplica a pesquisa e os filtros selecionados
  const trensFiltrados = trens.filter((trem) => {
    const termo = termoPesquisado.toLowerCase();

    const correspondePesquisa =
      String(trem.prefixo ?? "").toLowerCase().includes(termo) ||
      String(trem.modelo ?? "").toLowerCase().includes(termo);

    const correspondeAno =
      filtroAno === "" || String(trem.ano) === filtroAno;

    const correspondeSituacao =
      filtroSituacao === "" ||
      String(trem.situacao ?? "").toLowerCase() ===
        filtroSituacao.toLowerCase();

    return (
      correspondePesquisa &&
      correspondeAno &&
      correspondeSituacao
    );
  });

  return (
    <div className="flex min-w-0 flex-col gap-6 sm:p-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Gerenciamento de trens
        </h1>

        <p className="text-sm text-muted-foreground">
          Consulte, pesquise e gerencie os trens cadastrados no sistema.
        </p>
      </div>

      {/* Barra de pesquisa e filtros */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ButtonGroup className="w-full min-w-0 lg:max-w-md">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border px-3">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />

            <Input
              placeholder="Digite um prefixo ou modelo"
              className="border-0 shadow-none focus-visible:ring-0"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  pesquisarTrens();
                }
              }}
            />
          </div>

          <Button variant="ghost" onClick={pesquisarTrens}>
            Pesquisar
          </Button>
        </ButtonGroup>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro por ano */}
          <Menubar>
            <MenubarMenu>
              <MenubarTrigger>
                {filtroAno ? `Ano: ${filtroAno}` : "Ano"}
              </MenubarTrigger>

              <MenubarContent>
                <MenubarItem onClick={() => setFiltroAno("")}>
                  Todos os anos
                </MenubarItem>

                {[
                  ...new Set(
                    trens
                      .map((trem) => String(trem.ano ?? ""))
                      .filter(Boolean)
                  ),
                ]
                  .sort((a, b) => Number(b) - Number(a))
                  .map((ano) => (
                    <MenubarItem
                      key={ano}
                      onClick={() => setFiltroAno(ano)}
                    >
                      {ano}
                    </MenubarItem>
                  ))}
              </MenubarContent>
            </MenubarMenu>
          </Menubar>

          {/* Filtro por situação */}
          <Menubar>
            <MenubarMenu>
              <MenubarTrigger>
                {filtroSituacao
                  ? `Situação: ${filtroSituacao}`
                  : "Situação"}
              </MenubarTrigger>

              <MenubarContent>
                <MenubarItem onClick={() => setFiltroSituacao("")}>
                  Todas as situações
                </MenubarItem>

                <MenubarItem onClick={() => setFiltroSituacao("ativo")}>
                  Ativo
                </MenubarItem>

                <MenubarItem
                  onClick={() => setFiltroSituacao("manutencao")}
                >
                  Manutenção
                </MenubarItem>

                <MenubarItem onClick={() => setFiltroSituacao("inativo")}>
                  Inativo
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>

          <Button onClick={() => navigate("/index/trensGerenciamento/novo")}>
            <PlusIcon className="mr-2 size-4" />
            Novo trem
          </Button>
        </div>
      </div>

      {/* Mensagem de erro */}
      {erro && (
        <div
          role="alert"
          className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600"
        >
          {erro}
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              buscarTrens();
              buscarSituacoes();
            }}
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Tabela de trens */}
      <div className="min-w-0 overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Prefixo</TableHead>
              <TableHead className="text-center">Modelo</TableHead>
              <TableHead className="text-center">Ano</TableHead>
              <TableHead className="text-center">Situação</TableHead>
              <TableHead className="w-[60px] text-right">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {carregando ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground etiqueta"
                >
                  Carregando trens...
                </TableCell>
              </TableRow>
            ) : (
              <>
                {trensFiltrados.map((trem) => (
                  <TableRow key={trem.id} className={`etiqueta-${trem.situacao}`}>
                    <TableCell className="font-medium">
                      {trem.prefixo}
                    </TableCell>

                    <TableCell>{trem.modelo}</TableCell>

                    <TableCell>{trem.ano}</TableCell>

                    <TableCell>
                      <span
                        className="inline-flex rounded-full px-2 py-1 text-xs font-medium"
                      >
                        {trem.situacao}
                      </span>
                    </TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Ações do trem ${trem.prefixo}`}
                          >
                            <MoreHorizontalIcon className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(`/index/trensGerenciamento/editar/${trem.id}`)
                            }
                          >
                            Editar
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => excluirTrem(trem.id)}
                          >
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}

                {trensFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {termoPesquisado || filtroAno || filtroSituacao
                        ? "Nenhum trem encontrado com esses critérios."
                        : "Nenhum trem cadastrado."}
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Resumo das situações */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Ativos</p>
          <p className="text-2xl font-bold">
            {situacoes.ativo ?? 0}
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Em manutenção</p>
          <p className="text-2xl font-bold">
            {situacoes["manutenção"] ?? situacoes.manutencao ?? 0}
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Inativos</p>
          <p className="text-2xl font-bold">
            {situacoes.inativo ?? 0}
          </p>
        </div>
      </div>
    </div>
  );
}
