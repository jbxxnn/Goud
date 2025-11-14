'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { PlusSignIcon, Loading03Icon, UserIcon } from '@hugeicons/core-free-icons';
import { Midwife, MidwivesResponse, CreateMidwifeRequest, UpdateMidwifeRequest } from '@/lib/types/midwife';
import MidwifeModal from '@/components/midwife-modal';
import { DataTable } from '@/components/ui/data-table';
import { createMidwifeColumns } from '@/components/midwife-table-columns';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { toast } from 'sonner';

interface MidwivesClientProps {
  initialMidwives: Midwife[];
  initialPagination: {
    page: number;
    totalPages: number;
  };
}

export default function MidwivesClient({ 
  initialMidwives, 
  initialPagination 
}: MidwivesClientProps) {
  const [midwives, setMidwives] = useState<Midwife[]>(initialMidwives);
  const [loading, setLoading] = useState(false);
  const [page] = useState(initialPagination.page);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMidwife, setEditingMidwife] = useState<Midwife | undefined>();
  const [viewingMidwife, setViewingMidwife] = useState<Midwife | undefined>();
  const [isViewMode, setIsViewMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [midwifeToDelete, setMidwifeToDelete] = useState<Midwife | null>(null);

  // Fetch midwives
  const fetchMidwives = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        active_only: 'false', // Show all midwives by default
      });

      const response = await fetch(`/api/midwives?${params}`);
      const data: MidwivesResponse = await response.json();

      if (!data.success) {
        throw new Error('Failed to fetch midwives');
      }

      setMidwives(data.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch midwives';
      toast.error('Failed to load midwives', {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [page]);

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

      // Refresh midwives
      await fetchMidwives();
      setDeleteDialogOpen(false);
      const midwifeName = `${midwifeToDelete.first_name} ${midwifeToDelete.last_name}`;
      setMidwifeToDelete(null);
      toast.success('Midwife deleted', {
        description: `${midwifeName} has been deleted successfully.`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete midwife';
      toast.error('Failed to delete midwife', {
        description: errorMessage,
      });
    }
  };

  // Toggle active status
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const midwife = midwives.find(m => m.id === id);
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
      await fetchMidwives();
      const midwifeName = midwife ? `${midwife.first_name} ${midwife.last_name}` : 'Midwife';
      toast.success(`Midwife ${newStatus ? 'activated' : 'deactivated'}`, {
        description: `${midwifeName} has been ${newStatus ? 'activated' : 'deactivated'}.`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update midwife';
      toast.error('Failed to update midwife', {
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
      await fetchMidwives();
      
      // Show success toast
      const midwifeName = data.first_name && data.last_name 
        ? `${data.first_name} ${data.last_name}` 
        : 'Midwife';
      toast.success(`Midwife ${isEditing ? 'updated' : 'created'}`, {
        description: `${midwifeName} has been ${isEditing ? 'updated' : 'created'} successfully.`,
      });
      
      // Close modal after successful save
      handleCloseModal();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save midwife';
      toast.error('Failed to save midwife', {
        description: errorMessage,
      });
      throw err; // Re-throw to let the form handle it
    }
  };

  // Load data when filters change
  useEffect(() => {
    fetchMidwives();
  }, [fetchMidwives]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-md font-bold tracking-tight">Midwives</h1>
          <p className="text-muted-foreground text-sm">
            Manage client midwives (verloskundigen) for booking references
          </p>
        </div>
        <Button 
          onClick={handleAddMidwife} 
          size="default"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4" />
          Add Midwife
        </Button>
      </div>

      {/* Midwives Table */}
      <div>
        <div className="p-0">
          {loading ? (
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
              <h3 className="text-lg font-medium mb-2">No midwives found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first midwife
              </p>
              <Button onClick={handleAddMidwife}>
                <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4" />
                Add Midwife
              </Button>
            </div>
          ) : (
            <DataTable
              columns={createMidwifeColumns({
                onEdit: handleEditMidwife,
                onDelete: handleDelete,
                onToggleActive: handleToggleActive,
                onView: handleViewMidwife
              })}
              data={midwives}
              searchKey="first_name"
              searchPlaceholder="Search midwives..."
              emptyMessage="No midwife records found."
            />
          )}
        </div>
      </div>

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
        title="Delete Midwife"
        description="Are you sure you want to delete this midwife? This action cannot be undone."
        itemName={midwifeToDelete ? `${midwifeToDelete.first_name} ${midwifeToDelete.last_name}` : undefined}
      />
    </div>
  );
}



