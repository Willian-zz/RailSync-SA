"use client"

import * as React from "react"
import { Users, Cpu, TrainTrack, TramFront } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavDev } from "@/components/nav-dev"
import { NavUser } from "@/components/nav-user"
import { SidebarLabel } from "@/components/sidebar-label"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

export function AppSidebar({
  onLogout,
  ...props
}) {
  const [usuario, setUsuario] = React.useState(null)

  React.useEffect(() => {
    async function buscarUsuario() {
      try {
        const resposta = await fetch(
          "http://localhost:3000/api/auth/me",
          {
            credentials: "include",
            cache: "no-store",
          }
        )

        if (!resposta.ok) {
          setUsuario(null)
          return
        }

        const dados = await resposta.json()
        setUsuario(dados)
      } catch (erro) {
        console.error("Erro ao buscar usuário:", erro)
        setUsuario(null)
      }
    }

    buscarUsuario()
  }, [])

  if (!usuario) {
    return null
  }

  const nomes = usuario?.name?.trim().split(/\s+/) ?? []

  const iniciais =
    (nomes[0]?.[0] || "") +
    (nomes[1]?.[0] || "")

  const data = {
    user: {
      name: usuario.name,
      email: usuario.email,
      avatar: "/avatars/shadcn.jpg",
      shortening: iniciais.toUpperCase(),
    },

    navMain: [
      {
        title: "Trens",
        url: "#",
        icon: (
          <TramFront />
        ),
        isActive: true,
        items: [
          {
            title: "Leituras",
            url: "#",
          },
          {
            title: "Gerenciamento",
            url: "/index/trensGerenciamento",
          },
        ],
      },

      {
        title: "Linhas",
        url: "#",
        icon: (
          <TrainTrack />
        ),
        items: [
          {
            title: "Gerenciamento",
            url: "#",
          },
        ],
      },

      {
        title: "Sensores",
        url: "#",
        icon: (
          <Cpu />
        ),
        items: [
          {
            title: "Leituras",
            url: "#",
          },
          {
            title: "Gerenciamento",
            url: "#",
          },
        ],
      },
    ],

    devOptions: [
      {
        name: "Usuários",
        url: "#",
        icon: (
          <Users />
        ),
      },
    ],
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarLabel />
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDev projects={data.devOptions} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser
          user={data.user}
          onLogout={onLogout}
        />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}