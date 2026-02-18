'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon, InjectionIcon } from '@hugeicons/core-free-icons';
import { Service, ServicesResponse, CreateServiceRequest, UpdateServiceRequest } from '@/lib/types/service';
import ServiceModal from '@/components/service-modal';
import { DataTable } from '@/components/ui/data-table';
import { createServiceColumns } from '@/components/services-table-columns';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageContainer, { PageItem } from '@/components/ui/page-transition';

interface ServicesClientProps {
  initialServices: Service[];
  initialPagination: {
    page: number;
    totalPages: number;
    total: number;
  };
  userRole: string;
}

export default function ServicesClient({
  initialServices,
  initialPagination,
  userRole
}: ServicesClientProps) {
  const t = useTranslations('Services');
  const tTable = useTranslations('Table');
  const queryClient = useQueryClient();

  const [page, setPage] = useState(initialPagination.page);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | undefined>();
  const [viewingService, setViewingService] = useState<Service | undefined>();
  const [isViewMode, setIsViewMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);

  const isAdmin = userRole === 'admin';

  // Fetch services with React Query
  const { data: servicesData, isLoading } = useQuery({
    queryKey: ['services', page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        active_only: 'false',
      });

      const response = await fetch(`/api/services?${params}`);
      const data: ServicesResponse = await response.json();

      if (!data.success) {
        throw new Error('Failed to fetch services');
      }

      return data;
    },
    initialData: initialServices.length > 0 ? {
      success: true,
      data: initialServices,
      pagination: {
        page: initialPagination.page,
        total_pages: initialPagination.totalPages,
        total: initialPagination.total,
        limit: 20
      }
    } : undefined,
  });

  const services = servicesData?.data || [];
  const pagination = servicesData?.pagination;
  const totalPages = pagination?.total_pages || 0;
  const total = pagination?.total || 0;

  // Delete service
  const handleDelete = async (service: Service) => {
    setServiceToDelete(service);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!serviceToDelete) return;

    try {
      const response = await fetch(`/api/services/${serviceToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete service');
      }

      // Invalidate cache
      await queryClient.invalidateQueries({ queryKey: ['services'] });

      setDeleteDialogOpen(false);
      const serviceName = serviceToDelete.name;
      setServiceToDelete(null);
      toast.success(t('notifications.deleteSuccess'), {
        description: t('notifications.deleteDescription', { name: serviceName }),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete service';
      toast.error(t('notifications.deleteError'), {
        description: errorMessage,
      });
    }
  };

  // Toggle active status
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const service = services.find(s => s.id === id);
    const newStatus = !currentStatus;

    try {
      const response = await fetch(`/api/services/${id}`, {
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
        throw new Error(errorData.error || 'Failed to update service');
      }

      // Invalidate cache
      await queryClient.invalidateQueries({ queryKey: ['services'] });

      toast.success(newStatus ? t('notifications.activated') : t('notifications.deactivated'), {
        description: newStatus
          ? t('notifications.activatedDescription', { name: service?.name || '' })
          : t('notifications.deactivatedDescription', { name: service?.name || '' }),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update service';
      toast.error(t('notifications.updateError'), {
        description: errorMessage,
      });
    }
  };

  // Modal handlers
  const handleAddService = () => {
    setEditingService(undefined);
    setViewingService(undefined);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setViewingService(undefined);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleViewService = (service: Service) => {
    setViewingService(service);
    setEditingService(undefined);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingService(undefined);
    setViewingService(undefined);
    setIsViewMode(false);
  };

  // Save service
  const handleSaveService = async (data: CreateServiceRequest | UpdateServiceRequest) => {
    const isEditing = !!editingService;

    try {
      const url = editingService ? `/api/services/${editingService.id}` : '/api/services';
      const method = editingService ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save service');
      }

      // Invalidate cache
      await queryClient.invalidateQueries({ queryKey: ['services'] });

      // Show success toast
      toast.success(isEditing ? t('notifications.updateSuccess') : t('notifications.createSuccess'), {
        description: isEditing
          ? t('notifications.updatedDescription', { name: data.name || '' })
          : t('notifications.createdDescription', { name: data.name || '' }),
      });

      // Close modal after successful save
      handleCloseModal();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save service';
      toast.error(t('notifications.saveError'), {
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
                {t('description')}
              </p>
            </div>
            {isAdmin && (
              <Button
                onClick={handleAddService}
                size="default"
              >
                {t('addService')}
              </Button>
            )}
          </div>
        </PageItem>

        {/* Services Table */}
        <PageItem>
          <div>
            <div className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-3">
                    <HugeiconsIcon icon={Loading03Icon} className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                </div>
              ) : services.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-3 mb-4">
                    <HugeiconsIcon icon={InjectionIcon} className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">{t('noServices')}</h3>
                  <p className="text-muted-foreground mb-4">
                    {t('getStarted')}
                  </p>
                  {isAdmin && (
                    <Button onClick={handleAddService}>
                      {t('addService')}
                    </Button>
                  )}
                </div>
              ) : (
                <DataTable
                  columns={createServiceColumns(
                    t,
                    handleEditService,
                    isAdmin ? handleDelete : undefined,
                    isAdmin ? handleToggleActive : undefined,
                    handleViewService
                  )}
                  data={services}
                  searchKey="name"
                  searchPlaceholder={t('searchPlaceholder')}
                  emptyMessage={t('noServicesEmpty')}
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
                      t('noServices')
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

        {/* Service Modal */}
        <ServiceModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          service={editingService || viewingService}
          onSave={handleSaveService}
          isViewMode={isViewMode}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          isOpen={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setServiceToDelete(null);
          }}
          onConfirm={confirmDelete}
          title={t('dialog.deleteTitle')}
          description={t('dialog.deleteDescription')}
          itemName={serviceToDelete ? serviceToDelete.name : undefined}
        />
      </div>
    </PageContainer>
  );
}