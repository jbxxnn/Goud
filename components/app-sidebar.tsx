
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
import { DashboardSquare03Icon, Building03Icon, UserGroup03Icon, BrochureIcon, Calendar02Icon, Loading04Icon, UserIcon} from '@hugeicons/core-free-icons';
import { usePathname } from 'next/navigation';

type UserRole = 'admin' | 'staff' | 'midwife' | 'client';

interface MenuItem {
  title: string;
  url: string;
  icon: React.ReactNode;
  roles?: UserRole[]; // If not specified, only admin can see it
}

// Menu items with role restrictions
const allMenuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: <HugeiconsIcon icon={DashboardSquare03Icon} />,
    roles: ['admin', 'client'], // Both admin and client can see dashboard
  },
  {
    title: "Locations",
    url: "/dashboard/locations",
    icon: <HugeiconsIcon icon={Building03Icon}  />,
    roles: ['admin'], // Admin only
  },
  {
    title: "Staff",
    url: "/dashboard/staff",
    icon: <HugeiconsIcon icon={UserGroup03Icon} />,
    roles: ['admin'], // Admin only
  },
  {
    title: "Midwives",
    url: "/dashboard/midwives",
    icon: <HugeiconsIcon icon={UserIcon} />,
    roles: ['admin'], // Admin only
  },
  {
    title: "Services",
    url: "/dashboard/services",
    icon: <HugeiconsIcon icon={BrochureIcon} />,
    roles: ['admin'], // Admin only
  },
  {
    title: "Shifts",
    url: "/dashboard/shifts",
    icon: <HugeiconsIcon icon={Loading04Icon} />,
    roles: ['admin'], // Admin only
  },
  {
    title: "Bookings",
    url: "/dashboard/bookings",
    icon: <HugeiconsIcon icon={Calendar02Icon} />,
    roles: ['admin'], // Admin only
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: <HugeiconsIcon icon={DashboardSquare03Icon} />,
    roles: ['admin'], // Admin only
  },
  {
    title: "Reports",
    url: "/dashboard/reports",
    icon: <HugeiconsIcon icon={DashboardSquare03Icon} />,
    roles: ['admin'], // Admin only
  },
  {
    title: "Audit Logs",
    url: "/dashboard/audit-logs",
    icon: <HugeiconsIcon icon={DashboardSquare03Icon} />,
    roles: ['admin'], // Admin only
  },
]

interface AppSidebarProps {
  userRole?: UserRole;
}

export function AppSidebar({ userRole = 'admin' }: AppSidebarProps) {
  const pathname = usePathname();
  
  // Filter menu items based on user role
  const items = allMenuItems.filter(item => {
    // If roles are not specified, default to admin only
    if (!item.roles) {
      return userRole === 'admin';
    }
    // Otherwise, check if user role is in the allowed roles
    return item.roles.includes(userRole);
  });

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
                    tooltip={item.title}
                      asChild 
                      isActive={isActive}
                      className={isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}
                      style={{ borderRadius: "0.2rem" }}
                    >
                      <a href={item.url} className="min-h-10 ">
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