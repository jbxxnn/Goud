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
import {
    Calendar02Icon,
    UserIcon,
    Image01Icon,
    PlusSignIcon
} from '@hugeicons/core-free-icons';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

// Client specific menu items
const clientMenuItems = [
    {
        title: "My Appointments",
        url: "/dashboard", // Landing page for client
        icon: <HugeiconsIcon icon={Calendar02Icon} />,
    },
    {
        title: "Book New Echo",
        url: "/dashboard/book",
        icon: <HugeiconsIcon icon={PlusSignIcon} />,
    },
    // {
    //     title: "Results & Media",
    //     url: "/dashboard/results",
    //     icon: <HugeiconsIcon icon={Image01Icon} />,
    // },
    {
        title: "Profile",
        url: "/dashboard/profile",
        icon: <HugeiconsIcon icon={UserIcon} />,
    },
];

export function ClientSidebar() {
    const pathname = usePathname();

    return (
        <Sidebar collapsible="icon">
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>
                        <Link href="/">
                            <Image src="/Goudecho.png" alt="Logo" width={100} height={100} className="pointer-events-cursor" />
                        </Link>
                    </SidebarGroupLabel>
                    <SidebarGroupContent className="mt-12">
                        <SidebarMenu>
                            {clientMenuItems.map((item) => {
                                // Normalize pathname by removing locale prefix (en or nl)
                                const normalizedPath = pathname.replace(/^\/(?:en|nl)/, '') || '/';

                                // Determine active state:
                                // For the main dashboard (My Appointments), require exact match
                                // For others, allow sub-path matching
                                const isActive = item.url === '/dashboard'
                                    ? normalizedPath === item.url
                                    : normalizedPath.startsWith(item.url);

                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            tooltip={item.title}
                                            asChild
                                            isActive={isActive}
                                            className={isActive ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "bg-sidebar text-sidebar-foreground"}
                                            style={{ borderRadius: "0.2rem" }}
                                        >
                                            <Link href={item.url} className="min-h-10 ">
                                                {item.icon}
                                                <span>{item.title}</span>
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
