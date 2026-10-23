import { useState } from "react";
import { Link } from "react-router-dom";
import { MoreHorizontal, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AvisoErro } from "@/components/aviso-erro";
import { useAuth } from "@/hooks/use-auth";
import { useDadosAtualizados } from "@/hooks/use-dados-atualizados";
import { api } from "@/lib/api";
import { normalizarBusca } from "@/lib/busca";

const cargos = { usuario: "Usuário", operario: "Operário", dev: "Dev" };

export default function UsuariosGerenciamento() {
  const { usuario: sessao } = useAuth();
  const { dados, erro, carregando, atualizar } =
    useDadosAtualizados("/usuarios");
  const [pesquisa, setPesquisa] = useState("");
  const [termo, setTermo] = useState("");
  const [erroAcao, setErroAcao] = useState("");
  const [excluindo, setExcluindo] = useState(null);
  const usuarios = (dados || []).filter((usuario) =>
    normalizarBusca(`${usuario.fullname} ${usuario.email}`).includes(
      normalizarBusca(termo),
    ),
  );
  const totalDevs = (dados || []).filter(
    (usuario) => usuario.cargo === "dev",
  ).length;

  async function excluir(usuario) {
    if (
      !window.confirm(
        `Excluir a conta de ${usuario.fullname}? Essa conta perderá o acesso ao site.`,
      )
    )
      return;
    setExcluindo(usuario.id);
    setErroAcao("");
    try {
      await api(`/usuarios/${usuario.id}`, { method: "DELETE" });
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
          Gerenciamento de usuários
        </h1>
        <p className="text-sm text-muted-foreground">
          Consulte contas, edite os dados e organize o acesso à operação.
        </p>
      </div>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form
          role="search"
          className="w-full min-w-0 sm:max-w-md"
          onSubmit={(event) => {
            event.preventDefault();
            setTermo(pesquisa.trim());
          }}
        >
          <ButtonGroup className="w-full min-w-0">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Input
                aria-label="Pesquisar usuários"
                placeholder="Nome ou email"
                value={pesquisa}
                onChange={(event) => setPesquisa(event.target.value)}
                className="border-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <Button type="submit" variant="ghost">
              Pesquisar
            </Button>
          </ButtonGroup>
        </form>
        <Button
          variant="outline"
          className="w-fit"
          onClick={atualizar}
          disabled={carregando}
        >
          <RefreshCw className={`size-4 ${carregando ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>
      <AvisoErro mensagem={erroAcao || erro} />
      <div
        className="min-w-0 overflow-hidden rounded-md border"
        aria-busy={carregando}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Nome</TableHead>
              <TableHead className="text-center">Email</TableHead>
              <TableHead className="text-center">Cargo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((usuario) => {
              const protegido =
                usuario.id === sessao.id ||
                (usuario.cargo === "dev" && totalDevs <= 1);
              return (
                <TableRow key={usuario.id}>
                  <TableCell className="font-medium">
                    {usuario.fullname}
                    {usuario.id === sessao.id && (
                      <p className="mt-1 text-xs font-normal text-muted-foreground">
                        Sua conta
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{usuario.email}</TableCell>
                  <TableCell>
                    <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      {cargos[usuario.cargo]}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Ações de ${usuario.fullname}`}
                            disabled={excluindo === usuario.id}
                          />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          render={
                            <Link
                              to={`/index/usuariosGerenciamento/editar/${usuario.id}`}
                            />
                          }
                        >
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => excluir(usuario)}
                          disabled={protegido}
                          title={
                            protegido
                              ? "A própria conta e o último dev não podem ser excluídos."
                              : undefined
                          }
                          variant="destructive"
                        >
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {!usuarios.length && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  {carregando
                    ? "Carregando usuários..."
                    : "Nenhum usuário encontrado."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

    </div>
  );
}
