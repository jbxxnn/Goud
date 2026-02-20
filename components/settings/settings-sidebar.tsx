'use client';

import { useState } from 'react';
import { SitewideBreaksManager } from '@/components/settings/sitewide-breaks-manager';
import { Calendar, User, Clock, Building2, CreditCard, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export function SettingsSidebar() {
  const [activeTab, setActiveTab] = useState<'holidays' | 'breaks' | 'general'>('holidays');
  const t = useTranslations('Dashboard');

  const navItems = [
    { id: 'general', label: 'General Settings', icon: User, disabled: true },
    { id: 'locations', label: 'Locations & Services', icon: Building2, disabled: true },
    { id: 'billing', label: 'Billing', icon: CreditCard, disabled: true },
    { id: 'notifications', label: 'Notifications', icon: Bell, disabled: true },
    { id: 'holidays', label: 'Holidays', icon: Calendar },
    { id: 'breaks', label: 'Sitewide Breaks', icon: Clock },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-8 mt-6">
      {/* Settings Sidebar */}
      <aside className="px-2 lg:px-0">
        <nav className="flex flex-col space-y-1 pb-4 md:pb-0">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => !item.disabled && setActiveTab(item.id as any)}
              disabled={item.disabled}
              className={cn(
                "flex justify-start items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap text-left w-full",
                activeTab === item.id 
                  ? "bg-primary text-primary-foreground" 
                  : item.disabled
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-muted hover:bg-muted hover:text-foreground"
              )}
              style={{borderRadius: '10px'}}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Settings Content Area */}
      <main className="flex-1 w-full min-w-0">
        {(activeTab === 'holidays' || activeTab === 'breaks') && (
           <SitewideBreaksManager activeTab={activeTab === 'holidays' ? 'holidays' : 'breaks'} />
        )}

        {activeTab === 'general' && (
          <div className="p-8 border rounded-lg bg-card text-center text-muted-foreground">
            General settings coming soon.
          </div>
        )}
      </main>
    </div>
  );
}
