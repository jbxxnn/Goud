
"use client"

import { useState, useEffect } from "react"
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
  useSidebar,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from '@hugeicons/react';
import { DashboardSquare03Icon, Building03Icon, UserGroup03Icon, BrochureIcon, Calendar02Icon, Loading04Icon, UserIcon, Mail01Icon } from '@hugeicons/core-free-icons';
import { Loader } from "lucide-react";


import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ClientSidebar } from "@/components/client-dashboard/sidebar";
import { MidwifeSidebar } from "@/components/midwife-sidebar";

type UserRole = 'admin' | 'staff' | 'midwife' | 'client' | 'assistant';

interface MenuItem {
  title: string;
  url: string;
  icon: React.ReactNode;
  comingsoon?: string;
  roles?: UserRole[]; // If not specified, only admin can see it
}

// Menu items with role restrictions
const allMenuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: <HugeiconsIcon icon={DashboardSquare03Icon} />,
    roles: ['admin', 'client', 'staff', 'assistant'], // All roles can see dashboard
  },
  {
    title: "Locations",
    url: "/dashboard/locations",
    icon: <HugeiconsIcon icon={Building03Icon} />,
    roles: ['admin', 'assistant'], // Admin and Assistant
  },
  {
    title: "Staff",
    url: "/dashboard/staff",
    icon: <HugeiconsIcon icon={UserGroup03Icon} />,
    roles: ['admin', 'assistant'], // Admin and Assistant
  },
  {
    title: "Midwives",
    url: "/dashboard/midwives",
    icon: <HugeiconsIcon icon={UserIcon} />,
    roles: ['admin', 'assistant'], // Admin and Assistant
  },
  {
    title: "Services",
    url: "/dashboard/services",
    icon: <HugeiconsIcon icon={BrochureIcon} />,
    roles: ['admin', 'assistant'], // Admin and Assistant
  },
  {
    title: "Shifts",
    url: "/dashboard/shifts",
    icon: <HugeiconsIcon icon={Loading04Icon} />,
    roles: ['admin', 'staff', 'assistant'], // Admin, Staff, and Assistant
  },
  {
    title: "Bookings",
    url: "/dashboard/bookings",
    icon: <HugeiconsIcon icon={Calendar02Icon} />,
    roles: ['admin', 'assistant'], // Admin and Assistant
  },
  {
    title: "Clients",
    url: "/dashboard/clients",
    icon: <HugeiconsIcon icon={UserIcon} />,
    roles: ['admin', 'assistant'], // Admin and Assistant
  },
  {
    title: "Leave Requests",
    url: "#",
    comingsoon: "coming soon",
    icon: <HugeiconsIcon icon={Calendar02Icon} />,
    roles: ['admin'], // Admin only
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    // comingsoon: "coming soon",
    icon: <HugeiconsIcon icon={DashboardSquare03Icon} />,
    roles: ['admin'], // Admin only
  },
  {
    title: "Reports",
    url: "#",
    comingsoon: "coming soon",
    icon: <HugeiconsIcon icon={DashboardSquare03Icon} />,
    roles: ['admin'], // Admin only
  },
  {
    title: "Email Templates",
    url: "#",
    comingsoon: "coming soon",
    icon: <HugeiconsIcon icon={Mail01Icon} />,
    roles: ['admin'], // Admin only
  },
  {
    title: "Audit Logs",
    url: "#",
    comingsoon: "coming soon",
    icon: <HugeiconsIcon icon={DashboardSquare03Icon} />,
    roles: ['admin'], // Admin only
  },
]

interface AppSidebarProps {
  userRole?: UserRole;
}

export function AppSidebar({ userRole = 'admin' }: AppSidebarProps) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);

  // Clear loading state when pathname changes
  useEffect(() => {
    setLoadingUrl(null);
  }, [pathname]);

  // Filter menu items based on user role
  const items = allMenuItems.filter(item => {
    // If roles are not specified, default to admin or assistant
    if (!item.roles) {
      return userRole === 'admin' || userRole === 'assistant';
    }
    // Otherwise, check if user role is in the allowed roles
    return item.roles.includes(userRole);
  });

  if (userRole === 'client') {
    return <ClientSidebar />;
  }

  if (userRole === 'midwife') {
    return <MidwifeSidebar />;
  }

  return (
    <Sidebar collapsible="icon" className="border-r-0" style={{ borderRight: 'none' }}>
      <SidebarContent>
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="border-b border-r border-secondary h-14 ">
            <Link href="/">
              <Image src="/Goudecho.png" alt="Logo" width={100} height={100} className="pointer-events-cursor" />
            </Link>
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-12 px-4">
            <SidebarMenu>
              {items.map((item) => {
                // Normalize pathname by removing locale prefix (en or nl)
                const normalizedPath = pathname.replace(/^\/(?:en|nl)/, '') || '/';

                // Determine active state:
                // For the main dashboard, require an exact match to avoid highlighting it for all children.
                // For other items, allow sub-path matching (e.g. /dashboard/clients matches /dashboard/clients/new).
                const isActive = item.url === '/dashboard'
                  ? normalizedPath === item.url
                  : normalizedPath.startsWith(item.url);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      asChild
                      isActive={isActive}
                      className={isActive ? "bg-primary shadow-lg text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "bg-sidebar text-sidebar-foreground"}
                      style={{ borderRadius: "1rem" }}
                    >
                      <Link
                        href={item.url}
                        className="min-h-10 "
                        onClick={() => {
                          if (item.url !== "#" && item.url !== pathname) {
                            setLoadingUrl(item.url);
                          }
                          if (isMobile) {
                            setOpenMobile(false);
                          }
                        }}
                      >
                        {loadingUrl === item.url ? (
                          <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                          item.icon
                        )}
                        <span>{item.title}</span> <span className="text-[10px] bg-primary rounded-full px-1 text-primary-foreground">{item.comingsoon}</span>
                      </Link>
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