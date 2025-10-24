'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { PlusSignIcon, Loading03Icon, InjectionIcon } from '@hugeicons/core-free-icons';
import { Service, ServicesResponse, CreateServiceRequest, UpdateServiceRequest } from '@/lib/types/service';
import ServiceModal from '@/components/service-modal';
import { DataTable } from '@/components/ui/data-table';
import { createServiceColumns } from '@/components/services-table-columns';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';

interface ServicesClientProps {
  initialServices: Service[];
  initialPagination: {
    page: number;
    totalPages: number;
  };
}

export default function ServicesClient({ 
  initialServices, 
  initialPagination 
}: ServicesClientProps) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page] = useState(initialPagination.page);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | undefined>();
  const [viewingService, setViewingService] = useState<Service | undefined>();
  const [isViewMode, setIsViewMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);

  // Fetch services
  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        active_only: 'false', // Show all services by default
      });

      const response = await fetch(`/api/services?${params}`);
      const data: ServicesResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch services');
      }

      setServices(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [page]);

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
        throw new Error('Failed to delete service');
      }

      // Refresh services
      await fetchServices();
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete service');
    }
  };

  // Toggle active status
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/services/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update service');
      }

      // Refresh services
      await fetchServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update service');
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save service');
      }

      // Refresh services
      await fetchServices();
      
      // Close modal after successful save
      handleCloseModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save service');
      throw err; // Re-throw to let the form handle it
    }
  };

  // Load data when filters change
  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Services</h1>
          <p className="text-muted-foreground">
            Manage ultrasound services and their configurations
          </p>
        </div>
        <Button 
          onClick={handleAddService} 
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          size="default"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4" />
          Add Service
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="border-destructive bg-destructive/5">
          <div className="pt-6">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-destructive" />
              <p className="text-destructive font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Services Table */}
      <div>
        <div className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <HugeiconsIcon icon={Loading03Icon} className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            </div>
          ) : services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-3 mb-4">
                <HugeiconsIcon icon={InjectionIcon} className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No services found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first service
              </p>
              <Button onClick={handleAddService}>
                <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4" />
                Add Service
              </Button>
            </div>
          ) : (
            <DataTable
              columns={createServiceColumns(
                handleEditService,
                handleDelete,
                handleToggleActive,
                handleViewService
              )}
              data={services}
              searchKey="name"
              searchPlaceholder="Search services..."
            />
          )}
        </div>
      </div>

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
        title="Delete Service"
        description="Are you sure you want to delete this service? This action cannot be undone."
        itemName={serviceToDelete ? serviceToDelete.name : undefined}
      />
    </div>
  );
}