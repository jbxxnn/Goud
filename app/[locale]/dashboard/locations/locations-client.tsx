'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon } from '@hugeicons/core-free-icons';
import { Location, LocationsResponse, CreateLocationRequest, UpdateLocationRequest } from '@/lib/types/location_simple';
import { LocationModal } from '@/components/location-modal';
import { DataTable } from '@/components/ui/data-table';
import { createLocationColumns } from '@/components/locations-table-columns';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageContainer, { PageItem } from '@/components/ui/page-transition';

interface LocationsClientProps {
  initialLocations: Location[];
  initialPagination: {
    page: number;
    totalPages: number;
  };
}

export default function LocationsClient({
  initialLocations,
  initialPagination
}: LocationsClientProps) {
  const t = useTranslations('Locations');
  const tCommon = useTranslations('Common');
  const queryClient = useQueryClient();

  const [page] = useState(initialPagination.page);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);

  // Fetch locations with React Query
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations', page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        active_only: 'false',
      });

      const response = await fetch(`/api/locations-simple?${params}`);
      const data: LocationsResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch locations');
      }

      return data.data || [];
    },
    initialData: initialLocations.length > 0 ? initialLocations : undefined,
  });

  // Delete location
  const handleDelete = async (location: Location) => {
    setLocationToDelete(location);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!locationToDelete) return;

    try {
      const response = await fetch(`/api/locations-simple/${locationToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete location');
      }

      // Invalidate cache
      await queryClient.invalidateQueries({ queryKey: ['locations'] });

      setDeleteDialogOpen(false);
      setLocationToDelete(null);
      toast.success(t('toasts.deleteSuccess'), {
        description: t('toasts.deletedDescription', { name: locationToDelete.name }),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('toasts.deleteError');
      toast.error(t('toasts.deleteError'), {
        description: errorMessage,
      });
    }
  };

  // Toggle active status
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const location = locations.find(loc => loc.id === id);
    const newStatus = !currentStatus;

    try {
      const response = await fetch(`/api/locations-simple/${id}`, {
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
        throw new Error(errorData.error || 'Failed to update location');
      }

      // Invalidate cache
      await queryClient.invalidateQueries({ queryKey: ['locations'] });

      toast.success(t('toasts.statusChanged', { status: newStatus ? 'activated' : 'deactivated' }), {
        description: location ? t('toasts.statusDescription', { name: location.name, status: newStatus ? 'activated' : 'deactivated' }) : undefined,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('toasts.updateSuccess');
      toast.error(t('toasts.updateSuccess'), {
        description: errorMessage,
      });
    }
  };

  // Modal handlers
  const handleAddLocation = () => {
    setEditingLocation(undefined);
    setIsModalOpen(true);
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLocation(undefined);
  };

  // Save location
  const handleSaveLocation = async (data: CreateLocationRequest | UpdateLocationRequest) => {
    const isEditing = !!editingLocation;

    try {
      const url = editingLocation ? `/api/locations-simple/${editingLocation.id}` : '/api/locations-simple';
      const method = editingLocation ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save location');
      }

      // Invalidate cache
      await queryClient.invalidateQueries({ queryKey: ['locations'] });

      // Show success toast
      toast.success(isEditing ? t('toasts.updateSuccess') : t('toasts.createSuccess'), {
        description: t('toasts.savedDescription', { name: data.name || '', action: isEditing ? 'updated' : 'created' }),
      });

      // Close modal after toast is shown
      handleCloseModal();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('toasts.saveError');
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
            <div>
              <h1 className="text-md font-bold tracking-tight">{t('title')}</h1>
              <p className="text-muted-foreground text-sm">
                {t('subtitle')}
              </p>
            </div>
            <Button size="default" onClick={handleAddLocation}>
              {t('addLocation')}
            </Button>
          </div>
        </PageItem>

        {/* Advanced Locations Table */}
        <PageItem>
          <div>
            <div className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <HugeiconsIcon icon={Loading03Icon} className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <DataTable
                  columns={createLocationColumns(
                    t,
                    handleEditLocation,
                    handleDelete,
                    handleToggleActive
                  )}
                  data={locations}
                  searchKey="name"
                  searchPlaceholder={t('table.searchPlaceholder')}
                  emptyMessage={t('table.empty')}
                  showColumnToggle={false}
                />
              )}
            </div>
          </div>
        </PageItem>

        {/* Location Modal */}
        <LocationModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          location={editingLocation as Location | undefined}
          onSave={handleSaveLocation}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          isOpen={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setLocationToDelete(null);
          }}
          onConfirm={confirmDelete}
          title={t('deleteDialog.title')}
          description={t('deleteDialog.description')}
          itemName={locationToDelete ? locationToDelete.name : undefined}
          confirmButtonText={tCommon('delete')}
        />
      </div>
    </PageContainer>
  );
}
