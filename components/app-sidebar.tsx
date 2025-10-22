
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
import { DashboardSquare03Icon, Location03Icon, UserGroup03Icon} from '@hugeicons/core-free-icons';



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
    icon: <HugeiconsIcon icon={DashboardSquare03Icon} />,
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
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      {item.icon}
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}