'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon, UserIcon } from '@hugeicons/core-free-icons';
import { Midwife, MidwivesResponse, CreateMidwifeRequest, UpdateMidwifeRequest } from '@/lib/types/midwife';
import MidwifeModal from '@/components/midwife-modal';
import { DataTable } from '@/components/ui/data-table';
import { createMidwifeColumns } from '@/components/midwife-table-columns';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageContainer, { PageItem } from '@/components/ui/page-transition';

interface MidwivesClientProps {
  initialMidwives: Midwife[];
  initialPagination: {
    page: number;
    totalPages: number;
    total: number;
  };
  userRole: string;
}

export default function MidwivesClient({
  initialMidwives,
  initialPagination,
  userRole
}: MidwivesClientProps) {
  const t = useTranslations('Midwives');
  const tCommon = useTranslations('Common');
  const tTable = useTranslations('Table');
  const queryClient = useQueryClient();

  const [page, setPage] = useState(initialPagination.page);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMidwife, setEditingMidwife] = useState<Midwife | undefined>();
  const [viewingMidwife, setViewingMidwife] = useState<Midwife | undefined>();
  const [isViewMode, setIsViewMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [midwifeToDelete, setMidwifeToDelete] = useState<Midwife | null>(null);

  const isAdmin = userRole === 'admin';

  // Fetch midwives with React Query
  const { data: midwivesData, isLoading } = useQuery({
    queryKey: ['midwives', page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        active_only: 'false',
      });

      const response = await fetch(`/api/midwives?${params}`);
      const data: MidwivesResponse & { pagination?: { total_pages: number; total: number } } = await response.json();

      if (!data.success) {
        throw new Error('Failed to fetch midwives');
      }

      return data;
    },
    initialData: initialMidwives.length > 0 ? {
      success: true,
      data: initialMidwives,
      pagination: {
        page: initialPagination.page,
        total_pages: initialPagination.totalPages,
        total: initialPagination.total,
        limit: 20
      }
    } as any : undefined,
  });

  const midwives = midwivesData?.data || [];
  const pagination = midwivesData?.pagination;
  const totalPages = (pagination as any)?.total_pages || 0;
  const total = (pagination as any)?.total || 0;

  // Delete midwife
  const handleDelete = async (midwife: Midwife) => {
    setMidwifeToDelete(midwife);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!midwifeToDelete) return;

    try {
      const response = await fetch(`/api/midwives/${midwifeToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete midwife');
      }

      // Invalidate cache
      await queryClient.invalidateQueries({ queryKey: ['midwives'] });

      setDeleteDialogOpen(false);
      const midwifeName = `${midwifeToDelete.first_name} ${midwifeToDelete.last_name}`;
      setMidwifeToDelete(null);
      toast.success(t('toasts.deleteSuccess'), {
        description: t('toasts.deletedDescription', { name: midwifeName }),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete midwife';
      toast.error(t('toasts.deleteError'), {
        description: errorMessage,
      });
    }
  };

  // Toggle active status
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const midwife = midwives.find((m: Midwife) => m.id === id);
    const newStatus = !currentStatus;

    try {
      const response = await fetch(`/api/midwives/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: newStatus,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update midwife');
      }

      // Refresh midwives
      await queryClient.invalidateQueries({ queryKey: ['midwives'] });

      const midwifeName = midwife ? `${midwife.first_name} ${midwife.last_name}` : 'Midwife';
      const statusText = newStatus ? 'activated' : 'deactivated';
      toast.success(t('toasts.statusChanged', { status: statusText }), {
        description: t('toasts.statusDescription', { name: midwifeName, status: statusText }),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update midwife';
      toast.error(t('toasts.updateSuccess'), {
        description: errorMessage,
      });
    }
  };

  // Modal handlers
  const handleAddMidwife = () => {
    setEditingMidwife(undefined);
    setViewingMidwife(undefined);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleEditMidwife = (midwife: Midwife) => {
    setEditingMidwife(midwife);
    setViewingMidwife(undefined);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleViewMidwife = (midwife: Midwife) => {
    setViewingMidwife(midwife);
    setEditingMidwife(undefined);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMidwife(undefined);
    setViewingMidwife(undefined);
    setIsViewMode(false);
  };

  // Save midwife
  const handleSaveMidwife = async (data: CreateMidwifeRequest | UpdateMidwifeRequest) => {
    const isEditing = !!editingMidwife;

    try {
      const url = editingMidwife ? `/api/midwives/${editingMidwife.id}` : '/api/midwives';
      const method = editingMidwife ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save midwife');
      }

      // Refresh midwives
      await queryClient.invalidateQueries({ queryKey: ['midwives'] });

      // Show success toast
      const midwifeName = data.first_name && data.last_name
        ? `${data.first_name} ${data.last_name}`
        : 'Midwife';

      toast.success(isEditing ? t('toasts.updateSuccess') : t('toasts.createSuccess'), {
        description: t('toasts.savedDescription', { name: midwifeName, action: isEditing ? 'updated' : 'created' }),
      });

      // Close modal after successful save
      handleCloseModal();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save midwife';
      toast.error(t('toasts.saveError'), {
        description: errorMessage,
      });
      throw err;
    }
  };

  return (
    <PageContainer>
      <div className="space-y-6 p-6 bg-card" style={{ borderRadius: '0.5rem' }}>
        {/* Header */}
        <PageItem>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-md font-bold tracking-tight">{t('title')}</h1>
              <p className="text-muted-foreground text-sm">
                {t('subtitle')}
              </p>
            </div>
            {isAdmin && (
              <Button
                onClick={handleAddMidwife}
                size="default"
              >
                {t('addMidwife')}
              </Button>
            )}
          </div>
        </PageItem>

        {/* Midwives Table */}
        <PageItem>
          <div>
            <div className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-3">
                    <HugeiconsIcon icon={Loading03Icon} className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                </div>
              ) : midwives.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-3 mb-4">
                    <HugeiconsIcon icon={UserIcon} className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">{t('empty.title')}</h3>
                  <p className="text-muted-foreground mb-4">
                    {t('empty.description')}
                  </p>
                  {isAdmin && (
                    <Button onClick={handleAddMidwife}>
                      {t('addMidwife')}
                    </Button>
                  )}
                </div>
              ) : (
                <DataTable
                  columns={createMidwifeColumns(t, {
                    onEdit: handleEditMidwife,
                    onDelete: isAdmin ? handleDelete : undefined,
                    onToggleActive: isAdmin ? handleToggleActive : undefined,
                    onView: handleViewMidwife
                  })}
                  data={midwives}
                  searchKey="first_name"
                  searchPlaceholder={t('table.searchPlaceholder')}
                  emptyMessage={t('table.empty')}
                  showPagination={false}
                  showColumnToggle={false}
                  pageSize={20}
                />
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4 mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {total > 0 ? (
                      tTable('showing', {
                        start: (page - 1) * 20 + 1,
                        end: Math.min(page * 20, total),
                        total
                      })
                    ) : (
                      t('empty.title')
                    )}
                  </span>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1 || isLoading}
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
                            disabled={isLoading}
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
                      disabled={page === totalPages || isLoading}
                    >
                      {tTable('next')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </PageItem>

        {/* Midwife Modal */}
        <MidwifeModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          midwife={editingMidwife || viewingMidwife}
          onSave={handleSaveMidwife}
          isViewMode={isViewMode}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          isOpen={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setMidwifeToDelete(null);
          }}
          onConfirm={confirmDelete}
          title={t('deleteDialog.title')}
          description={t('deleteDialog.description')}
          itemName={midwifeToDelete ? `${midwifeToDelete.first_name} ${midwifeToDelete.last_name}` : undefined}
          confirmButtonText={tCommon('delete')}
        />
      </div>
    </PageContainer>
  );
}
