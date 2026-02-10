'use client';

import { useTranslations } from 'next-intl';
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon, UserIcon } from '@hugeicons/core-free-icons';
import { Staff, StaffsResponse, CreateStaffRequest, UpdateStaffRequest } from '@/lib/types/staff';
import StaffModal from '@/components/staff-modal';
import { DataTable } from '@/components/ui/data-table';
import { createStaffColumns } from '@/components/staff-table-columns';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageContainer, { PageItem } from '@/components/ui/page-transition';

interface StaffClientProps {
  initialStaff: Staff[];
  initialPagination: {
    page: number;
    totalPages: number;
    total: number;
  };
}

export default function StaffClient({
  initialStaff,
  initialPagination
}: StaffClientProps) {
  const t = useTranslations('Staff');
  const tCommon = useTranslations('Common');
  const tTable = useTranslations('Table');
  const queryClient = useQueryClient();

  const [page, setPage] = useState(initialPagination.page);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | undefined>();
  const [viewingStaff, setViewingStaff] = useState<Staff | undefined>();
  const [isViewMode, setIsViewMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);

  const ensureUserRoleIsStaff = useCallback(async (userId: string) => {
    if (!userId) return;

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'staff' }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update user role');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(t('toasts.roleUpdateError'), {
        description: errorMessage,
      });
    }
  }, [t]);

  const syncUserProfileFields = useCallback(
    async (
      userId: string,
      fields: { first_name?: string; last_name?: string; phone?: string }
    ) => {
      if (!userId) return;

      const payload: Record<string, string | null> = {};

      if (fields.first_name !== undefined) {
        payload.first_name = fields.first_name?.trim() ? fields.first_name : null;
      }
      if (fields.last_name !== undefined) {
        payload.last_name = fields.last_name?.trim() ? fields.last_name : null;
      }
      if (fields.phone !== undefined) {
        payload.phone = fields.phone?.trim() ? fields.phone : null;
      }

      if (Object.keys(payload).length === 0) {
        return;
      }

      try {
        const response = await fetch(`/api/users/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to sync user profile');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        toast.error(t('toasts.profileUpdateError'), {
          description: errorMessage,
        });
      }
    },
    [t]
  );

  // Fetch staff with React Query
  const { data: staffData, isLoading } = useQuery({
    queryKey: ['staff', page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        active_only: 'false',
      });

      const response = await fetch(`/api/staff?${params}`);
      const data: StaffsResponse & { pagination?: { total_pages: number; total: number } } = await response.json();

      if (!data.success) {
        throw new Error('Failed to fetch staff');
      }

      return data;
    },
    initialData: initialStaff.length > 0 ? {
      success: true,
      data: initialStaff,
      pagination: {
        page: initialPagination.page,
        total_pages: initialPagination.totalPages,
        total: initialPagination.total,
        limit: 20
      }
    } as any : undefined,
  });

  const staff = staffData?.data || [];
  const pagination = staffData?.pagination;
  const totalPages = (pagination as any)?.total_pages || 0;
  const total = (pagination as any)?.total || 0;

  // Delete staff
  const handleDelete = async (staff: Staff) => {
    setStaffToDelete(staff);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!staffToDelete) return;

    try {
      const response = await fetch(`/api/staff/${staffToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete staff');
      }

      // Invalidate cache
      const { invalidateStaffAssignmentsCache } = await import('@/lib/utils/cache-invalidation');
      invalidateStaffAssignmentsCache();

      await queryClient.invalidateQueries({ queryKey: ['staff'] });

      setDeleteDialogOpen(false);
      const staffName = `${staffToDelete.first_name} ${staffToDelete.last_name}`;
      setStaffToDelete(null);
      toast.success(t('toasts.deleteSuccess'), {
        description: t('toasts.deletedDescription', { name: staffName }),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete staff';
      toast.error(t('toasts.deleteError'), {
        description: errorMessage,
      });
    }
  };

  // Toggle active status
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const staffMember = staff.find((s: Staff) => s.id === id);
    const newStatus = !currentStatus;

    try {
      const response = await fetch(`/api/staff/${id}`, {
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
        throw new Error(errorData.error || 'Failed to update staff');
      }

      // Refresh staff
      await queryClient.invalidateQueries({ queryKey: ['staff'] });

      const staffName = staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : 'Staff member';
      const statusText = newStatus ? 'activated' : 'deactivated';
      toast.success(t('toasts.statusChanged', { status: statusText }), {
        description: t('toasts.statusDescription', { name: staffName, status: statusText }),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update staff';
      toast.error(t('toasts.updateSuccess'), {
        description: errorMessage,
      });
    }
  };

  // Modal handlers
  const handleAddStaff = () => {
    setEditingStaff(undefined);
    setViewingStaff(undefined);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleEditStaff = (staff: Staff) => {
    setEditingStaff(staff);
    setViewingStaff(undefined);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleViewStaff = (staff: Staff) => {
    setViewingStaff(staff);
    setEditingStaff(undefined);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStaff(undefined);
    setViewingStaff(undefined);
    setIsViewMode(false);
  };

  // Save staff
  const handleSaveStaff = async (data: CreateStaffRequest | UpdateStaffRequest) => {
    const isEditing = !!editingStaff;

    try {
      const url = editingStaff ? `/api/staff/${editingStaff.id}` : '/api/staff';
      const method = editingStaff ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save staff');
      }

      // Invalidate cache if response indicates it
      const { invalidateStaffAssignmentsCache } = await import('@/lib/utils/cache-invalidation');
      invalidateStaffAssignmentsCache();

      // Refresh staff
      await queryClient.invalidateQueries({ queryKey: ['staff'] });

      const userIdForSync = editingStaff
        ? editingStaff.user_id
        : 'user_id' in data
          ? data.user_id
          : undefined;

      if (!editingStaff && 'user_id' in data && data.user_id) {
        await ensureUserRoleIsStaff(data.user_id);
      }

      if (userIdForSync) {
        await syncUserProfileFields(userIdForSync, {
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
        });
      }

      // Show success toast
      const staffName = data.first_name && data.last_name
        ? `${data.first_name} ${data.last_name}`
        : 'Staff member';

      toast.success(isEditing ? t('toasts.updateSuccess') : t('toasts.createSuccess'), {
        description: t('toasts.savedDescription', { name: staffName, action: isEditing ? 'updated' : 'created' }),
      });

      // Close modal after successful save
      handleCloseModal();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save staff';
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
            <Button
              onClick={handleAddStaff}
              size="default"
            >
              {t('addStaff')}
            </Button>
          </div>
        </PageItem>

        {/* Staff Table */}
        <PageItem>
          <div>
            <div className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-3">
                    <HugeiconsIcon icon={Loading03Icon} className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                </div>
              ) : staff.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-3 mb-4">
                    <HugeiconsIcon icon={UserIcon} className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">{t('empty.title')}</h3>
                  <p className="text-muted-foreground mb-4">
                    {t('empty.description')}
                  </p>
                  <Button onClick={handleAddStaff}>
                    {t('addStaff')}
                  </Button>
                </div>
              ) : (
                <DataTable
                  columns={createStaffColumns(t, {
                    onEdit: handleEditStaff,
                    onDelete: handleDelete,
                    onToggleActive: handleToggleActive,
                    onView: handleViewStaff
                  })}
                  data={staff}
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

        {/* Staff Modal */}
        <StaffModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          staff={editingStaff || viewingStaff}
          onSave={handleSaveStaff}
          isViewMode={isViewMode}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          isOpen={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setStaffToDelete(null);
          }}
          onConfirm={confirmDelete}
          title={t('deleteDialog.title')}
          description={t('deleteDialog.description')}
          itemName={staffToDelete ? `${staffToDelete.first_name} ${staffToDelete.last_name}` : undefined}
          confirmButtonText={tCommon('delete')}
        />
      </div>
    </PageContainer>
  );
}
