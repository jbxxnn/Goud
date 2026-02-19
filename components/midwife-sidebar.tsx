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
import {
    Calendar02Icon,
    UserIcon,
    PlusSignIcon,
} from '@hugeicons/core-free-icons';
import { Loader } from "lucide-react";
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function MidwifeSidebar() {
    const pathname = usePathname();
    const { isMobile, setOpenMobile } = useSidebar();
    const t = useTranslations('MidwifeSidebar');
    const [loadingUrl, setLoadingUrl] = useState<string | null>(null);

    // Clear loading state when pathname changes
    useEffect(() => {
        setLoadingUrl(null);
    }, [pathname]);

    // Midwife specific menu items
    // Defined inside component to access translation hook
    const midwifeMenuItems = [
        {
            title: t('appointments'),
            url: "/dashboard", // Landing page for midwife
            icon: <HugeiconsIcon icon={Calendar02Icon} />,
        },
        {
            title: t('book'),
            url: "/dashboard/book",
            icon: <HugeiconsIcon icon={PlusSignIcon} />,
        },
        {
            title: t('profile'),
            url: "/dashboard/profile",
            icon: <HugeiconsIcon icon={UserIcon} />,
        },
    ];

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
                            {midwifeMenuItems.map((item) => {
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
