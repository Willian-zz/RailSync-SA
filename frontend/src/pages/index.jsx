import { useAuth } from "@/hooks/use-auth";

import { Fragment } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";

import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

// Nomes que serão exibidos no breadcrumb
const nomesRotas = {
  index: "Início",
  trensLeituras: "Leituras de trens",
  relatorio: "Relatório da leitura",
  trensGerenciamento: "Gerenciamento de trens",
  sensoresGerenciamento: "Gerenciamento de sensores",
  trens: "Trens",
  rotasGerenciamento: "Gerenciamento de rotas",
  linhasGerenciamento: "Gerenciamento de linhas",
  linhas: "Consultar linhas",
  usuariosGerenciamento: "Gerenciamento de usuários",
  novo: "Novo",
  editar: "Editar",
};

// Gera os itens do breadcrumb automaticamente a partir da URL
function gerarBreadcrumb(pathname) {
  const partes = pathname.split("/").filter(Boolean);

  let caminhoAtual = "";

  return partes
    .filter((parte) => !/^\d+$/.test(parte))
    .map((parte) => {
      caminhoAtual += `/${parte}`;

      return {
        caminho: caminhoAtual,
        nome: nomesRotas[parte] || parte,
      };
    });
}

export default function Index() {
  const navigate = useNavigate();
  const { atualizarSessao } = useAuth();
  const location = useLocation();

  const breadcrumbs = gerarBreadcrumb(location.pathname);

  async function logout() {
    const confirmar = window.confirm(
      "Tem certeza que deseja sair?"
    );

    if (!confirmar) return;

    try {
      const resposta = await fetch(
        "http://localhost:3000/api/auth/logout",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        console.error(dados.message);
        return;
      }

      console.log(dados.message);
      await atualizarSessao();
      navigate("/login");
    } catch (error) {
      console.error(
        "Erro ao conectar com o servidor:",
        error
      );
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar onLogout={logout} />

      <SidebarInset>
        <header className="flex min-h-16 shrink-0 items-center gap-2 py-3 transition-[width,height] ease-linear md:h-16 md:py-0 group-has-data-[collapsible=icon]/sidebar-wrapper:md:h-12 group-has-data-[collapsible=icon]/sidebar-wrapper:md:min-h-12">
          <div className="flex min-w-0 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />

            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />

            <Breadcrumb className="min-w-0 [overflow-wrap:anywhere]">
              <BreadcrumbList>
                {breadcrumbs.map((item, index) => {
                  const ultimo =
                    index === breadcrumbs.length - 1;

                  return (
                    <Fragment key={item.caminho}>
                      {index > 0 && <BreadcrumbSeparator />}

                      <BreadcrumbItem className="min-w-0 text-left">
                        {ultimo ? (
                          <BreadcrumbPage>
                            {item.nome}
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink render={<Link to={item.caminho} />}>
                            {item.nome}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </Fragment>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <main className="flex min-w-0 flex-1 flex-col gap-4 p-4 pt-0 [overflow-wrap:anywhere]">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
