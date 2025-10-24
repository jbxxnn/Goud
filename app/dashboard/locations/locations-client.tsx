'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HugeiconsIcon } from '@hugeicons/react';
import { PlusSignIcon, Loading03Icon } from '@hugeicons/core-free-icons';
import { Location, LocationsResponse, CreateLocationRequest, UpdateLocationRequest } from '@/lib/types/location_simple';
import { LocationModal } from '@/components/location-modal';
import { DataTable } from '@/components/ui/data-table';
import { createLocationColumns } from '@/components/locations-table-columns';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';

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
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page] = useState(initialPagination.page);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);

  // Fetch locations
  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        active_only: 'false', // Show all locations by default
      });

      const response = await fetch(`/api/locations-simple?${params}`);
      const data: LocationsResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch locations');
      }

      setLocations(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [page]);

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
        throw new Error('Failed to delete location');
      }

      // Refresh locations
      await fetchLocations();
      setDeleteDialogOpen(false);
      setLocationToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete location');
    }
  };

  // Toggle active status
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/locations-simple/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update location');
      }

      // Refresh locations
      await fetchLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update location');
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save location');
      }

      // Refresh locations
      await fetchLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save location');
      throw err; // Re-throw to let the form handle it
    }
  };

  // Load data when filters change
  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
          <p className="text-muted-foreground">
            Manage clinic locations and their information
          </p>
        </div>
        <Button onClick={handleAddLocation} className="hover:bg-secondary hover:text-secondary-foreground" style={{ borderRadius: '0.5rem' }}>
          <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4" />
          Add Location
        </Button>
      </div>


      {/* Error Message */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Advanced Locations Table */}
      <div>
        <div className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <HugeiconsIcon icon={Loading03Icon} className="mr-2 h-8 w-8 animate-spin" />
            </div>
          ) : (
            <DataTable
              columns={createLocationColumns(
                handleEditLocation,
                handleDelete,
                handleToggleActive
              )}
              data={locations}
              searchKey="name"
              searchPlaceholder="Search locations..."
            />
          )}
        </div>
      </div>


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
        title="Delete Location"
        description="Are you sure you want to delete this location? This action cannot be undone."
        itemName={locationToDelete ? locationToDelete.name : undefined}
      />
    </div>
  );
}
