import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"

export function NavMain({
  items
}) {
  const { pathname } = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()
  const [menusAbertos, setMenusAbertos] = useState(() => {
    try {
      const salvos = JSON.parse(localStorage.getItem('railsync-menus-sidebar') || '{}')
      if (!salvos || typeof salvos !== 'object' || Array.isArray(salvos)) return {}
      return Object.fromEntries(Object.entries(salvos).filter(([, aberto]) => typeof aberto === 'boolean'))
    } catch {
      return {}
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('railsync-menus-sidebar', JSON.stringify(menusAbertos))
    } catch {
      // O estado continua em memória se o armazenamento estiver indisponível.
    }
  }, [menusAbertos])

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.id}
            open={menusAbertos[item.id] ?? Boolean(item.isActive)}
            onOpenChange={aberto => setMenusAbertos(atuais => ({ ...atuais, [item.id]: aberto }))}
            className="group/collapsible"
            render={<SidebarMenuItem />}
          >
            <CollapsibleTrigger
              render={<SidebarMenuButton tooltip={item.title} />}
            >
              {item.icon}
              <span>{item.title}</span>
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.items?.map((subItem) => (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarMenuSubButton
                      isActive={pathname === subItem.url || pathname.startsWith(`${subItem.url}/`)}
                      render={<Link to={subItem.url} onClick={() => { if (isMobile) setOpenMobile(false) }} />}
                    >
                      <span>{subItem.title}</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
