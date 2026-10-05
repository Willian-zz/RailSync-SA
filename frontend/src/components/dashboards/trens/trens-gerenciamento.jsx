import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

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

export default function TrensGerenciamento() {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="aspect-video rounded-xl bg-muted/50"></div>

        <div className="aspect-video rounded-xl bg-muted/50" />

        <div className="aspect-video rounded-xl bg-muted/50" />
      </div>

      <div className="min-h-[50vh] rounded-xl bg-muted/50">
        <Menubar className="min-w-[60vw]">
          <Field>
            <ButtonGroup>
              <Input
                id="input-button-group"
                placeholder="Digite um prefixo ou modelo"
              />
              <Button variant="outline">Pesquisar</Button>
            </ButtonGroup>
          </Field>
          <MenubarMenu>
            <MenubarTrigger>Ano</MenubarTrigger>
            <MenubarContent className="w-64">
              <MenubarCheckboxItem>
                2020
              </MenubarCheckboxItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Modelo</MenubarTrigger>
            <MenubarContent>
              <MenubarCheckboxItem >Locomotiva</MenubarCheckboxItem>
              <MenubarCheckboxItem>Carga</MenubarCheckboxItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Estado</MenubarTrigger>
            <MenubarContent>
              <MenubarCheckboxItem>Ativo</MenubarCheckboxItem>
              <MenubarCheckboxItem >Manutenção</MenubarCheckboxItem>
              <MenubarCheckboxItem>Inativo</MenubarCheckboxItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>
    </div>
  );
}
