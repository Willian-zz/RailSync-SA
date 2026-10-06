import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

import { MoreHorizontalIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";

import { Separator } from "@/components/ui/separator";

export default function TrensGerenciamento() {
  const [trens, setTrens] = useState([]);

  async function buscarTrens() {
    try {
      const resposta = await fetch("http://localhost:3000/api/stmt/trains", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const trens = await resposta.json()

      setTrens(trens)
    } catch (error) {
      console.error("Erro ao conectar com o servidor: ", error);
    }
  }

  useEffect(() => {
    buscarTrens()
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="aspect-video rounded-xl bg-muted/50"></div>

        <div className="aspect-video rounded-xl bg-muted/50" />

        <div className="aspect-video rounded-xl bg-muted/50" />
      </div>

      <div className=" w-full rounded-xl border bg-background overflow-hidden">
        <div className="flex items-center w-full border-b-1 rounded-xl">
          <div className="flex flex-1">
            <Input
              placeholder="Digite um prefixo ou modelo"
              className="border-0 shadow-none focus-visible:ring-0"
            />

            <Button variant="ghost">Pesquisar</Button>
          </div>

          <Separator orientation="vertical" />

          <Menubar className="border-0 rounded-none">
            <MenubarMenu>
              <MenubarTrigger>Ano</MenubarTrigger>
              <MenubarContent>
                <MenubarCheckboxItem>2020</MenubarCheckboxItem>
              </MenubarContent>
            </MenubarMenu>

            <MenubarMenu>
              <MenubarTrigger>Estado</MenubarTrigger>
              <MenubarContent>
                <MenubarCheckboxItem>Ativo</MenubarCheckboxItem>
                <MenubarCheckboxItem>Manutenção</MenubarCheckboxItem>
                <MenubarCheckboxItem>Inativo</MenubarCheckboxItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>

          <Separator orientation="vertical" />

          <Button className="rounded-xl rounded-l-none">Novo trem</Button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 z-20 bg-background">Prefixo</TableHead>
                <TableHead className="sticky top-0 z-20 bg-background">Modelo</TableHead>
                <TableHead className="sticky top-0 z-20 bg-background">Situação</TableHead>
                <TableHead className="sticky top-0 z-20 bg-background text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trens.map((trem) => (
                <TableRow className={`text-left etiqueta-${trem.situacao}`} key={trem.id}>
                  <TableCell className="font-medium">{trem.prefixo}</TableCell>
                  <TableCell className="font-medium">{trem.modelo}</TableCell>
                  <TableCell className="font-medium">{trem.situacao}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontalIcon />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
