'use client';

import { useTranslations } from 'next-intl';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon, UserIcon } from '@hugeicons/core-free-icons';
import { User, UsersResponse } from '@/lib/types/user';
import { DataTable } from '@/components/ui/data-table';
import { createClientColumns } from '@/components/clients-table-columns';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatEuroCents } from '@/lib/currency/format';
import { Calendar as CalendarIcon, Download, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageContainer, { PageItem } from '@/components/ui/page-transition';

type AnalyticsCard = {
  label: string;
  value: string;
  changeText: string;
  changeTone: 'positive' | 'negative' | 'neutral';
};

type ClientStats = {
  totalClients: number;
  clientsWithBookings: number;
  clientsWithUpcoming: number;
  totalRevenue: number;
};

const ALL_TIME_RANGE: DateRange = {
  from: new Date(2010, 0, 1),
  to: new Date(2099, 11, 31, 23, 59, 59, 999),
};

const getDefaultRange = (): DateRange => {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), 0, 1),
    to: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
  };
};

interface ClientsClientProps {
  initialClients: User[];
  initialPagination: {
    page: number;
    totalPages: number;
    total: number;
  };
}

export default function ClientsClient({
  initialClients,
  initialPagination
}: ClientsClientProps) {
  const t = useTranslations('Clients');
  const tTable = useTranslations('Table');
  const router = useRouter();

  // URL & Filter State
  const [page, setPage] = useState(initialPagination.page);
  const [limit, setLimit] = useState<number>(20); // Default to 20
  const [searchQuery, setSearchQuery] = useState<string>('');
  const roleOptions = ['client', 'staff', 'midwife', 'admin'] as const;
  type RoleOption = (typeof roleOptions)[number];
  const [selectedRole, setSelectedRole] = useState<RoleOption>('client');

  // Date Range State
  const defaultRange = useMemo(() => getDefaultRange(), []);
  const [dateRange, setDateRange] = useState<DateRange>(defaultRange);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // --- STATS DATA FETCHING ---
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['client-stats', dateRange],
    queryFn: async () => {
      if (!dateRange.from || !dateRange.to) return { current: null, previous: null };

      const isAllTime =
        dateRange.from.getTime() === ALL_TIME_RANGE.from!.getTime() &&
        dateRange.to.getTime() === ALL_TIME_RANGE.to!.getTime();

      const currentStart = dateRange.from;
      const currentEnd = dateRange.to;
      const rangeDuration = Math.max(
        currentEnd.getTime() - currentStart.getTime(),
        24 * 60 * 60 * 1000
      );
      const previousEnd = isAllTime ? null : new Date(currentStart.getTime() - 1);
      const previousStart = previousEnd ? new Date(previousEnd.getTime() - rangeDuration) : null;

      const currentParams = new URLSearchParams();
      currentParams.append('startDate', currentStart.toISOString());
      currentParams.append('endDate', currentEnd.toISOString());

      const currentPromise = fetch(`/api/clients/stats?${currentParams.toString()}`).then(r => r.json());

      let previousPromise: Promise<any> = Promise.resolve(null);
      if (previousStart && previousEnd) {
        const previousParams = new URLSearchParams();
        previousParams.append('startDate', previousStart.toISOString());
        previousParams.append('endDate', previousEnd.toISOString());
        previousPromise = fetch(`/api/clients/stats?${previousParams.toString()}`).then(r => r.json());
      }

      const [currentData, previousData] = await Promise.all([currentPromise, previousPromise]);

      return {
        current: currentData?.success && currentData?.data ? (currentData.data as ClientStats) : null,
        previous: previousData?.success && previousData?.data ? (previousData.data as ClientStats) : null
      };
    },
    enabled: !!dateRange.from && !!dateRange.to,
  });

  const stats = statsData?.current || null;
  const comparisonStats = statsData?.previous || null;

  // --- CLIENTS DATA FETCHING ---
  const { data: clientsData, isLoading: clientsLoading } = useQuery<UsersResponse>({
    queryKey: ['clients', page, limit, searchQuery, selectedRole],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (selectedRole) params.append('role', selectedRole);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/users?${params}`);
      const data: UsersResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch clients');
      }
      return data;
    },
    initialData: (page === 1 && limit === 20 && !searchQuery && selectedRole === 'client' && initialClients.length > 0) ? {
      success: true,
      data: initialClients,
      pagination: {
        page: initialPagination.page,
        total_pages: initialPagination.totalPages,
        total: initialPagination.total,
        limit: 20
      }
    } as any : undefined,
  });

  const clients = clientsData?.data || [];
  const pagination = clientsData?.pagination;
  const totalPages = pagination?.total_pages || 0;
  const total = pagination?.total || 0;
  const loading = clientsLoading;


  // View client details
  const handleView = (client: User) => {
    router.push(`/dashboard/clients/${client.id}`);
  };

  // Reset to page 1 when limit changes
  useEffect(() => {
    setPage(1);
  }, [limit, selectedRole]);



  const isAllTimeRange =
    dateRange.from?.getTime() === ALL_TIME_RANGE.from?.getTime() &&
    dateRange.to?.getTime() === ALL_TIME_RANGE.to?.getTime();

  const formattedRange = isAllTimeRange
    ? t('filters.allTime')
    : dateRange.from
      ? dateRange.to
        ? `${format(dateRange.from, 'LLL dd, yyyy')} - ${format(dateRange.to, 'LLL dd, yyyy')}`
        : format(dateRange.from, 'LLL dd, yyyy')
      : t('filters.dateRange');

  const roleLabel = selectedRole ? t(`roles.plural.${selectedRole}`) : t('roles.plural.users');

  const currentStats: ClientStats =
    stats ?? {
      totalClients: 0,
      clientsWithBookings: 0,
      clientsWithUpcoming: 0,
      totalRevenue: 0,
    };
  const previousStats: ClientStats | null = comparisonStats;

  const percentChange = (currentValue: number, previousValue: number | null) => {
    if (previousValue === null) {
      return { changeText: '—', changeTone: 'neutral' as const };
    }
    if (previousValue === 0) {
      if (currentValue === 0) {
        return { changeText: '0%', changeTone: 'neutral' as const };
      }
      return { changeText: '+100%', changeTone: 'positive' as const };
    }
    const diff = currentValue - previousValue;
    if (diff === 0) {
      return { changeText: '0%', changeTone: 'neutral' as const };
    }
    const percent = Math.round((diff / previousValue) * 100);
    return {
      changeText: `${diff > 0 ? '+' : ''}${percent}%`,
      changeTone: diff > 0 ? ('positive' as const) : ('negative' as const),
    };
  };

  const revenueChange = (currentValue: number, previousValue: number | null) => {
    if (previousValue === null) {
      return { changeText: '—', changeTone: 'neutral' as const };
    }
    if (previousValue === 0) {
      if (currentValue === 0) {
        return { changeText: '€0', changeTone: 'neutral' as const };
      }
      return { changeText: `+${formatEuroCents(currentValue)}`, changeTone: 'positive' as const };
    }
    const diff = currentValue - previousValue;
    if (diff === 0) {
      return { changeText: '€0', changeTone: 'neutral' as const };
    }
    return {
      changeText: `${diff > 0 ? '+' : '-'}${formatEuroCents(Math.abs(diff))}`,
      changeTone: diff > 0 ? ('positive' as const) : ('negative' as const),
    };
  };

  const totalClientsDelta = percentChange(
    currentStats.totalClients,
    previousStats?.totalClients ?? null
  );
  const clientsWithBookingsDelta = percentChange(
    currentStats.clientsWithBookings,
    previousStats?.clientsWithBookings ?? null
  );
  const revenueDelta = revenueChange(
    currentStats.totalRevenue,
    previousStats?.totalRevenue ?? null
  );

  const analyticsCards: AnalyticsCard[] = [
    {
      label: t('analytics.totalClients'),
      value: currentStats.totalClients.toLocaleString('nl-NL'),
      changeText: totalClientsDelta.changeText,
      changeTone: totalClientsDelta.changeTone,
    },
    {
      label: t('analytics.withBookings'),
      value: currentStats.clientsWithBookings.toLocaleString('nl-NL'),
      changeText: clientsWithBookingsDelta.changeText,
      changeTone: clientsWithBookingsDelta.changeTone,
    },
    {
      label: t('analytics.totalRevenue'),
      value: formatEuroCents(currentStats.totalRevenue),
      changeText: revenueDelta.changeText,
      changeTone: revenueDelta.changeTone,
    },
  ];

  return (
    <PageContainer className="space-y-6 p-6 bg-white">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-md font-semibold tracking-tight">{t('title')}</h1>
            <p className="text-muted-foreground text-xs">{t('description')}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end gap-2">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as RoleOption)}
              >
                <SelectTrigger className="w-full sm:w-40 h-11 rounded-2xl border border-[#e7e1d9] bg-white text-sm">
                  <SelectValue placeholder={t('filters.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role}>
                      {t(`roles.${role}`).charAt(0).toUpperCase() + t(`roles.${role}`).slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative flex-1 min-w-[240px]">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder={t('filters.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 h-11 rounded-2xl border border-[#e7e1d9] bg-white text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={`h-11 w-[280px] rounded-2xl border border-[#e7e1d9] bg-white text-sm font-medium justify-start text-left px-4 gap-2 ${!dateRange.from ? 'text-muted-foreground' : ''
                      }`}
                  >
                    <CalendarIcon className="h-4 w-4 text-[#6c5544]" />
                    {formattedRange}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="flex flex-col gap-3 p-3">
                    <Button
                      type="button"
                      variant={isAllTimeRange ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => {
                        setDateRange({
                          from: new Date(ALL_TIME_RANGE.from!),
                          to: new Date(ALL_TIME_RANGE.to!),
                        });
                        setIsDatePickerOpen(false);
                      }}
                    >
                      {t('filters.allTime')}
                    </Button>
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={
                        isAllTimeRange ? new Date() : dateRange.from ?? new Date()
                      }
                      selected={dateRange}
                      onSelect={(range) => {
                        if (range?.from && range?.to) {
                          setDateRange(range);
                          setIsDatePickerOpen(false);
                        } else if (range) {
                          setDateRange(range);
                        } else {
                          setDateRange(defaultRange);
                        }
                      }}
                      numberOfMonths={2}
                    />
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                className="h-11 rounded-2xl bg-black hover:bg-black/90 text-white text-sm font-medium"
              >
                <Download className="h-4 w-4 mr-2" />
                {t('filters.export')}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analyticsCards.map((card) => (
            <Card
              key={card.label}
              className={`border border-muted bg-white transition-opacity ${statsLoading ? 'opacity-60' : 'opacity-100'
                }`}
              style={{ borderRadius: '0.7rem' }}
            >
              <CardContent className="p-0">
                <div className="flex items-start justify-between pt-4 px-4">
                  <div>
                    <p className="text-sm font-medium text-primary">{card.label}</p>
                    <p className="text-[32px] font-semibold tracking-tight mt-2">
                      {statsLoading ? (
                        <span className="inline-flex h-8 w-20 animate-pulse rounded bg-[#f4ede4]" />
                      ) : (
                        card.value
                      )}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${card.changeTone === 'positive'
                      ? 'bg-emerald-100 text-emerald-700'
                      : card.changeTone === 'negative'
                        ? 'bg-rose-100 text-rose-600'
                        : 'bg-zinc-100 text-zinc-600'
                      }`}
                  >
                    {card.changeText}
                  </span>
                </div>
                <div className="bg-muted text-xs text-muted-foreground border-t border-muted p-3" style={{ borderRadius: '0 0 0.7rem 0.7rem' }}>
                  {t('analytics.from')} {formattedRange}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Clients Table */}
      <div>
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-lg">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <HugeiconsIcon icon={Loading03Icon} className="h-5 w-5 animate-spin" />
              </div>
            </div>
          )}

          {clients.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
              <div className="rounded-full bg-muted p-3 mb-4">
                <HugeiconsIcon icon={UserIcon} className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium mb-2">
                {t('table.emptyTitle', { role: selectedRole ? t(`roles.plural.${selectedRole}`) : t('roles.plural.users') })}
              </h3>
              <p className="text-muted-foreground text-xs">
                {t('table.emptyDescription', { role: selectedRole ? t(`roles.plural.${selectedRole}`) : t('roles.plural.users') })}
              </p>
            </div>
          ) : (
            <DataTable
              columns={createClientColumns({ onView: handleView, t })}
              data={clients}
              emptyMessage={t('table.emptyMessage', { role: selectedRole ? t(`roles.plural.${selectedRole}`) : t('roles.plural.users') })}
              showColumnToggle={false}
            />
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">{tTable('itemsPerPage')}:</label>
              <Select
                value={limit.toString()}
                onValueChange={(value) => {
                  setLimit(parseInt(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {total > 0 ? (
                  <>
                    {tTable('showing', { start: (page - 1) * limit + 1, end: Math.min(page * limit, total), total: total })}{' '}
                  </>
                ) : (
                  <>{t('table.emptyTitle', { role: roleLabel })}</>
                )}
              </span>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  {tTable('previous')}
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        disabled={loading}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                >
                  {tTable('next')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

