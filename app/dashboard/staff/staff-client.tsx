'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { PlusSignIcon, Loading03Icon, UserIcon } from '@hugeicons/core-free-icons';
import { Staff, StaffsResponse, CreateStaffRequest, UpdateStaffRequest } from '@/lib/types/staff';
import StaffModal from '@/components/staff-modal';
import { DataTable } from '@/components/ui/data-table';
import { createStaffColumns } from '@/components/staff-table-columns';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';

interface StaffClientProps {
  initialStaff: Staff[];
  initialPagination: {
    page: number;
    totalPages: number;
  };
}

export default function StaffClient({ 
  initialStaff, 
  initialPagination 
}: StaffClientProps) {
  const [staff, setStaff] = useState<Staff[]>(initialStaff);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page] = useState(initialPagination.page);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | undefined>();
  const [viewingStaff, setViewingStaff] = useState<Staff | undefined>();
  const [isViewMode, setIsViewMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);

  // Fetch staff
  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        active_only: 'false', // Show all staff by default
      });

      const response = await fetch(`/api/staff?${params}`);
      const data: StaffsResponse = await response.json();

      if (!data.success) {
        throw new Error('Failed to fetch staff');
      }

      setStaff(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [page]);

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
        throw new Error('Failed to delete staff');
      }

      // Refresh staff
      await fetchStaff();
      setDeleteDialogOpen(false);
      setStaffToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete staff');
    }
  };

  // Toggle active status
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/staff/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update staff');
      }

      // Refresh staff
      await fetchStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update staff');
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save staff');
      }

      // Refresh staff
      await fetchStaff();
      
      // Close modal after successful save
      handleCloseModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save staff');
      throw err; // Re-throw to let the form handle it
    }
  };

  // Load data when filters change
  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Staff</h1>
          <p className="text-muted-foreground">
            Manage clinic staff, their qualifications, and location assignments
          </p>
        </div>
        <Button 
          onClick={handleAddStaff} 
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          size="default"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4" />
          Add Staff
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

      {/* Staff Table */}
      <div>
        <div className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <HugeiconsIcon icon={Loading03Icon} className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            </div>
          ) : staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-3 mb-4">
                <HugeiconsIcon icon={UserIcon} className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No staff found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first staff member
              </p>
              <Button onClick={handleAddStaff}>
                <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4" />
                Add Staff
              </Button>
            </div>
          ) : (
            <DataTable
              columns={createStaffColumns({
                onEdit: handleEditStaff,
                onDelete: handleDelete,
                onToggleActive: handleToggleActive,
                onView: handleViewStaff
              })}
              data={staff}
              searchKey="first_name"
              searchPlaceholder="Search staff..."
            />
          )}
        </div>
      </div>

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
        title="Delete Staff"
        description="Are you sure you want to delete this staff member? This action cannot be undone."
        itemName={staffToDelete ? `${staffToDelete.first_name} ${staffToDelete.last_name}` : undefined}
      />
    </div>
  );
}
