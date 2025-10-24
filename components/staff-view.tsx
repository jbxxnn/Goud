'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  UserIcon, 
  MailIcon, 
  CallIcon, 
  CalendarIcon,
  MapPinIcon,
  InjectionIcon
} from '@hugeicons/core-free-icons';
import { Staff, getStaffDisplayName, getStaffRoleDisplay } from '@/lib/types/staff';
import { Location } from '@/lib/types/location_simple';
import { Service } from '@/lib/types/service';

interface StaffViewProps {
  staff: Staff;
}

export default function StaffView({ staff }: StaffViewProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch staff details with locations and services
  useEffect(() => {
    const fetchStaffDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch all locations and services
        const [locationsRes, servicesRes, staffDetailsRes] = await Promise.all([
          fetch('/api/locations-simple'),
          fetch('/api/services'),
          fetch(`/api/staff/${staff.id}`)
        ]);

        const [locationsData, servicesData, staffDetailsData] = await Promise.all([
          locationsRes.json(),
          servicesRes.json(),
          staffDetailsRes.json()
        ]);

        if (locationsData.success && servicesData.success && staffDetailsData.success) {
          const staffLocationIds = staffDetailsData.data.location_ids || [];
          const staffServiceIds = staffDetailsData.data.service_ids || [];

          // Filter to only selected locations and services
          const selectedLocations = locationsData.data?.filter((loc: Location) => 
            staffLocationIds.includes(loc.id)
          ) || [];
          
          const selectedServices = servicesData.data?.filter((svc: Service) => 
            staffServiceIds.includes(svc.id)
          ) || [];

          setLocations(selectedLocations);
          setServices(selectedServices);
        }
      } catch (error) {
        console.error('Error fetching staff details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStaffDetails();
  }, [staff.id]);
  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={UserIcon} className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="text-sm">{getStaffDisplayName(staff)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Role</label>
              <div className="mt-1">
                <Badge variant="secondary">
                  {getStaffRoleDisplay(staff.role)}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="mt-1">
                <Badge variant={staff.is_active ? 'default' : 'secondary'}>
                  {staff.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={MailIcon} className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={MailIcon} className="h-4 w-4 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-sm">{staff.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={CallIcon} className="h-4 w-4 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <p className="text-sm">{staff.phone || 'Not provided'}</p>
              </div>
            </div>
            {staff.hire_date && (
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={CalendarIcon} className="h-4 w-4 text-muted-foreground" />
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Hire Date</label>
                  <p className="text-sm">{new Date(staff.hire_date).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Professional Information */}
      {staff.bio && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={UserIcon} className="h-5 w-5" />
              Bio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{staff.bio}</p>
          </CardContent>
        </Card>
      )}

      {/* Location Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={MapPinIcon} className="h-5 w-5" />
            Location Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : locations.length === 0 ? (
            <div className="text-sm text-muted-foreground">No locations assigned</div>
          ) : (
            <div className="space-y-2">
              {locations.map((location) => (
                <div key={location.id} className="flex items-start gap-2">
                  <HugeiconsIcon icon={MapPinIcon} className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">{location.name}</div>
                    <div className="text-xs text-muted-foreground">{location.address}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Qualifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={InjectionIcon} className="h-5 w-5" />
            Service Qualifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : services.length === 0 ? (
            <div className="text-sm text-muted-foreground">No services assigned</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {services.map((service) => (
                <Badge key={service.id} variant="secondary">
                  {service.name} ({service.duration}m)
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
