
"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from '@hugeicons/react';
import { DashboardSquare03Icon, Location03Icon, UserGroup03Icon, InjectionIcon, Calendar03Icon} from '@hugeicons/core-free-icons';
import { usePathname } from 'next/navigation';



// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: <HugeiconsIcon icon={DashboardSquare03Icon} />,
  },
  {
    title: "Locations",
    url: "/dashboard/locations",
    icon: <HugeiconsIcon icon={Location03Icon} size={24}
    color="#000000"
    strokeWidth={1.5} />,
  },
  {
      title: "Staff",
    url: "/dashboard/staff",
    icon: <HugeiconsIcon icon={UserGroup03Icon} />,
  },
  {
    title: "Services",
    url: "/dashboard/services",
    icon: <HugeiconsIcon icon={InjectionIcon} />,
  },
  {
    title: "Shifts",
    url: "/dashboard/shifts",
    icon: <HugeiconsIcon icon={Calendar03Icon} />,
  },
  {
    title: "Bookings",
    url: "/dashboard/bookings",
    icon: <HugeiconsIcon icon={DashboardSquare03Icon} />,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: <HugeiconsIcon icon={DashboardSquare03Icon} />,
  },
  {
    title: "Reports",
    url: "/dashboard/reports",
    icon: <HugeiconsIcon icon={DashboardSquare03Icon} />,
  },
  {
    title: "Audit Logs",
    url: "/dashboard/audit-logs",
    icon: <HugeiconsIcon icon={DashboardSquare03Icon} />,
  },
]

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent className="mt-12">
            <SidebarMenu>
              {items.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}
                      style={{ borderRadius: "0.5rem" }}
                    >
                      <a href={item.url} className="min-h-10 p-4">
                        {item.icon}
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}