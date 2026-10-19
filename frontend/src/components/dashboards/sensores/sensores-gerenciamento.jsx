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

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  MoreHorizontalIcon,
  SearchIcon,
  PlusIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";

export default function SensoresGerenciamento() {
  const navigate = useNavigate();

  const [sensores, setSensores] = useState([]);
  const [trens, setTrens] = useState([]);

  const [pesquisa, setPesquisa] = useState("");
  const [termoPesquisado, setTermoPesquisado] = useState("");

  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroTrem, setFiltroTrem] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  async function buscarSensores() {
    try {
      const resposta = await fetch("http://localhost:3000/api/stmt/sensors");

      if (!resposta.ok) {
        throw new Error("Não foi possível carregar os sensores.");
      }

      const dados = await resposta.json();
      setSensores(dados);
    } catch (error) {
      setErro(error.message || "Erro ao carregar os sensores.");
    } finally {
      setCarregando(false);
    }
  }

  async function buscarTrens() {
    try {
      const resposta = await fetch("http://localhost:3000/api/stmt/trains");

      if (!resposta.ok) {
        throw new Error("Não foi possível carregar os trens.");
      }

      const dados = await resposta.json();
      setTrens(dados);
    } catch (error) {
      setErro(error.message || "Erro ao carregar os trens.");
    }
  }

  useEffect(() => {
    buscarSensores();
    buscarTrens();
  }, []);

  function pesquisarSensores() {
    setTermoPesquisado(pesquisa.trim());
  }

  async function excluirSensor(id) {
    const confirmar = window.confirm(
      "Tem certeza que deseja excluir este sensor?",
    );

    if (!confirmar) return;

    try {
      const resposta = await fetch(
        `http://localhost:3000/api/stmt/sensors/${id}`,
        {
          method: "DELETE",
        },
      );

      if (!resposta.ok) {
        throw new Error("Não foi possível excluir o sensor.");
      }

      setSensores((sensoresAtuais) =>
        sensoresAtuais.filter(
          (sensor) => Number(sensor.id ?? sensor.id_sensor) !== Number(id),
        ),
      );
    } catch (error) {
      window.alert(error.message || "Erro ao excluir o sensor.");
    }
  }

  function obterTrem(tremId) {
    return trens.find((trem) => Number(trem.id) === Number(tremId));
  }

  // Tipos disponíveis nos sensores cadastrados.
  const tiposDisponiveis = [
    ...new Set(sensores.map((sensor) => sensor.tipo).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));

  // Trens disponíveis para o filtro.
  const trensDisponiveis = [
    ...new Map(trens.map((trem) => [Number(trem.id), trem])).values(),
  ].sort((a, b) =>
    String(a.prefixo ?? "").localeCompare(String(b.prefixo ?? ""), "pt-BR"),
  );

  // Pesquisa exclusivamente pelo código.
  // Os filtros de tipo e trem são aplicados em conjunto.
  const sensoresFiltrados = sensores.filter((sensor) => {
    const codigo = String(sensor.codigo ?? "").toLowerCase();
    const termo = termoPesquisado.toLowerCase();

    const correspondeCodigo = codigo.includes(termo);

    const correspondeTipo = !filtroTipo || sensor.tipo === filtroTipo;

    const correspondeTrem =
      !filtroTrem || Number(sensor.trem_id) === Number(filtroTrem);

    return correspondeCodigo && correspondeTipo && correspondeTrem;
  });

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Gerenciamento de sensores
        </h1>

        <p className="text-sm text-muted-foreground">
          Consulte, filtre e gerencie os sensores cadastrados.
        </p>
      </div>

      {/* Barra de pesquisa e filtros */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ButtonGroup className="w-full min-w-0 lg:max-w-md">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border px-3">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />

            <Input
              placeholder="Digite o código do sensor"
              className="border-0 shadow-none focus-visible:ring-0"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  pesquisarSensores();
                }
              }}
            />
          </div>

          <Button variant="ghost" onClick={pesquisarSensores}>
            Pesquisar
          </Button>
        </ButtonGroup>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro por tipo */}
          <Menubar>
            <MenubarMenu>
              <MenubarTrigger>
                {filtroTipo ? `Tipo: ${filtroTipo}` : "Tipo"}
              </MenubarTrigger>

              <MenubarContent>
                <MenubarItem onClick={() => setFiltroTipo("")}>
                  Todos os tipos
                </MenubarItem>

                <MenubarSeparator />

                {tiposDisponiveis.map((tipo) => (
                  <MenubarItem key={tipo} onClick={() => setFiltroTipo(tipo)}>
                    {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                  </MenubarItem>
                ))}
              </MenubarContent>
            </MenubarMenu>
          </Menubar>

          {/* Filtro por trem */}
          <Menubar>
            <MenubarMenu>
              <MenubarTrigger>
                {filtroTrem
                  ? `Trem: ${obterTrem(filtroTrem)?.prefixo ?? filtroTrem}`
                  : "Trem"}
              </MenubarTrigger>

              <MenubarContent>
                <MenubarItem onClick={() => setFiltroTrem("")}>
                  Todos os trens
                </MenubarItem>

                <MenubarSeparator />

                {trensDisponiveis.map((trem) => (
                  <MenubarItem
                    key={trem.id}
                    onClick={() => setFiltroTrem(String(trem.id))}
                  >
                    {trem.prefixo}
                  </MenubarItem>
                ))}
              </MenubarContent>
            </MenubarMenu>
          </Menubar>

          {/* Novo sensor */}
          <Button onClick={() => navigate("/index/sensoresGerenciamento/novo")}>
            <PlusIcon className="mr-2 size-4" />
            Novo sensor
          </Button>
        </div>
      </div>

      {/* Mensagens de estado */}
      {erro && <p className="text-sm text-destructive">{erro}</p>}

      {/* Tabela */}
      <div className="min-w-0 overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Código</TableHead>
              <TableHead className="text-center">Tipo</TableHead>
              <TableHead className="text-center">Unidade</TableHead>
              <TableHead className="text-center">Trem vinculado</TableHead>
              <TableHead className="w-[60px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {carregando ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  Carregando sensores...
                </TableCell>
              </TableRow>
            ) : sensoresFiltrados.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhum sensor encontrado.
                </TableCell>
              </TableRow>
            ) : (
              sensoresFiltrados.map((sensor, index) => {
                const id = sensor.id ?? sensor.id_sensor;
                const trem = obterTrem(sensor.trem_id);

                return (
                  <TableRow
                    key={id}
                    className={index % 2 === 0 ? "bg-muted/30" : ""}
                  >
                    <TableCell className="font-medium">
                      {sensor.codigo}
                    </TableCell>

                    <TableCell>
                      {sensor.tipo
                        ? sensor.tipo.charAt(0).toUpperCase() +
                          sensor.tipo.slice(1)
                        : "—"}
                    </TableCell>

                    <TableCell>{sensor.unidade || "—"}</TableCell>

                    <TableCell>
                      {trem ? trem.prefixo : "Trem não encontrado"}
                    </TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Ações do sensor ${sensor.codigo}`}
                          >
                            <MoreHorizontalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(
                                `/index/sensoresGerenciamento/editar/${id}`,
                              )
                            }
                          >
                            <PencilIcon className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => excluirSensor(id)}
                          >
                            <Trash2Icon className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Total de resultados */}
      <div className="text-sm text-muted-foreground">
        {sensoresFiltrados.length}{" "}
        {sensoresFiltrados.length === 1
          ? "sensor encontrado"
          : "sensores encontrados"}
      </div>
    </div>
  );
}
