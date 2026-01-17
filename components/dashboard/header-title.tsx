'use client';

import { usePathname } from 'next/navigation';

interface HeaderTitleProps {
    role: string;
    name: string;
}

export function HeaderTitle({ role, name }: HeaderTitleProps) {
    const pathname = usePathname();

    let title = 'Dashboard';
    let subtitle = `Welcome back, ${name}`;

    // Logic to determine title based on path
    if (pathname.includes('/dashboard/shifts')) {
        title = 'My Shifts';
        subtitle = 'View your upcoming scheduled shifts.';
    } else if (role === 'staff') {
        title = 'Staff Dashboard';
        subtitle = `Welcome back, ${name}`;
    } else if (role === 'client') {
        title = 'Client Dashboard';
    }

    // You can add more conditions here for other pages if needed

    return (
        <div className="flex flex-col justify-center">
            <h1 className="font-semibold text-sm leading-none">
                {title}
            </h1>
            <p className="text-xs text-muted-foreground leading-none mt-1">
                {subtitle}
            </p>
        </div>
    );
}
