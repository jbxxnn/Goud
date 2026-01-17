'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LanguageSkillIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

export function LanguageSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    const handleLocaleChange = (newLocale: string) => {
        router.replace(pathname, { locale: newLocale });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild className='rounded-full' style={{ borderRadius: '50%' }}>
                <Button variant="ghost" size="icon" className="w-9 h-9 focus-visible:ring-0 focus-visible:ring-offset-0">
                    <span className="text-lg leading-none mb-0.5">
                        {locale === 'nl' ? '🇳🇱' : locale === 'en' ? '🇬🇧' : ''}
                    </span>
                    <span className="sr-only">Switch language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className='p-4 border border-border shadow-lg' style={{ borderRadius: '0.5rem' }}>
                <DropdownMenuItem
                    onClick={() => handleLocaleChange('nl')}
                    className='focus:ring-0 focus:outline-none cursor-pointer'
                    style={{ borderRadius: '0.5rem' }}
                >
                    🇳🇱 Nederlands {locale === 'nl' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleLocaleChange('en')}
                    className='focus:ring-0 focus:outline-none cursor-pointer'
                    style={{ borderRadius: '0.5rem' }}
                >
                    🇬🇧 English {locale === 'en' && '✓'}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
