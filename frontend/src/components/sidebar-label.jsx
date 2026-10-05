"use client"

import { useNavigate } from "react-router-dom"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import { HugeiconsIcon } from "@hugeicons/react"
import { Train01Icon } from "@hugeicons/core-free-icons"

export function SidebarLabel() {

  const navigate = useNavigate()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="cursor-pointer hover:bg-transparent"
          onClick={() => navigate("/index")}
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <HugeiconsIcon
              icon={Train01Icon}
              strokeWidth={2}
            />
          </div>

          <span className="truncate font-medium">
            RailSync
          </span>

        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}