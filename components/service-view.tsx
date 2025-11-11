'use client';

import { useState, useEffect } from 'react';
import { Service } from '@/lib/types/service';
import { Staff } from '@/lib/types/staff';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Time04Icon, 
//   ClockIcon, 
  CoinsEuroIcon,
  CalendarIcon,
  SettingsIcon,
  FileEmpty02Icon,
  CheckmarkCircle01Icon,
  UserIcon,
//   XCircleIcon
} from '@hugeicons/core-free-icons';

interface ServiceViewProps {
  service: Service;
}

// Format duration in minutes to readable format
const formatDuration = (minutes: number) => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

// Format price
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
};

export default function ServiceView({ service }: ServiceViewProps) {
  const [assignedStaff, setAssignedStaff] = useState<Staff[]>([]);

  // Fetch staff details when service has staff_ids
  useEffect(() => {
    const fetchStaffDetails = async () => {
      if (service.staff_ids && service.staff_ids.length > 0) {
        try {
          const response = await fetch('/api/staff?active_only=false');
          if (response.ok) {
            const data = await response.json();
            const allStaff = data.data || [];
            // Filter staff that are assigned to this service
            const filtered = allStaff.filter((s: Staff) => service.staff_ids?.includes(s.id));
            setAssignedStaff(filtered);
          }
        } catch (error) {
          console.error('Error fetching staff:', error);
        }
      }
    };

    fetchStaffDetails();
  }, [service.staff_ids]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{service.name}</h2>
          {service.serviceCode && (
            <p className="text-sm font-mono uppercase tracking-wide text-muted-foreground mt-1">
              Code: {service.serviceCode}
            </p>
          )}
          {service.description && (
            <p className="text-muted-foreground mt-1">{service.description}</p>
          )}
        </div>
        <Badge variant={service.is_active ? "default" : "secondary"}>
          {service.is_active ? "Active" : "Inactive"}
        </Badge>
      </div>

      <Separator />

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <HugeiconsIcon icon={Time04Icon} className="h-5 w-5" />
              Duration & Timing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Duration:</span>
              <span className="font-bold text-xs">{formatDuration(service.duration)}</span>
            </div>
            {service.buffer_time > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Buffer Time:</span>
                <span className="font-bold text-xs">+{formatDuration(service.buffer_time)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Lead Time:</span>
              <span className="font-bold text-xs">{service.lead_time}h before</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Scheduling Window:</span>
              <span className="font-bold text-xs">{service.scheduling_window} weeks</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <HugeiconsIcon icon={CoinsEuroIcon} className="h-5 w-5" />
              Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Price:</span>
              <span className="font-bold text-xs">{formatPrice(service.price)}</span>
            </div>
            {service.sale_price && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Sale Price:</span>
                <span className="font-bold text-xs text-green-600">{formatPrice(service.sale_price)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Advanced Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <HugeiconsIcon icon={SettingsIcon} className="h-5 w-5" />
            Advanced Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Reschedule Cutoff:</span>
              <span className="font-bold text-xs">{service.reschedule_cutoff}h before</span>
            </div>
            {service.cancel_cutoff && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Cancel Cutoff:</span>
                <span className="font-bold text-xs">{service.cancel_cutoff}h before</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      {service.instructions && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <HugeiconsIcon icon={FileEmpty02Icon} className="h-5 w-5" />
              Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{service.instructions}</p>
          </CardContent>
        </Card>
      )}

      {/* Policy Fields */}
      {service.policy_fields && service.policy_fields.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-5 w-5" />
              Policy Fields ({service.policy_fields.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {service.policy_fields.map((field) => (
                <div key={field.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">
                      {field.title}
                      <span className="text-sm text-muted-foreground ml-2">
                        ({field.field_type.replace('_', ' ')})
                      </span>
                    </h4>
                    {field.is_required && (
                      <Badge variant="outline" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                  {field.description && (
                    <p className="text-sm text-muted-foreground mb-2">{field.description}</p>
                  )}
                  {field.field_type === 'multi_choice' && field.choices && field.choices.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Choices:</p>
                      <div className="space-y-2">
                        {field.choices.map((choice) => (
                          <div key={choice.id} className="flex items-center justify-between bg-muted/50 rounded-md p-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground">Title:</span>
                              <span className="text-sm font-medium">{choice.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground">Price:</span>
                              <span className="text-sm font-bold">{formatPrice(choice.price)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category */}
      {service.category_id && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <HugeiconsIcon icon={CalendarIcon} className="h-5 w-5" />
              Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">
              {service.service_categories?.name || 'Unknown Category'}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Assigned Staff */}
      {assignedStaff.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <HugeiconsIcon icon={UserIcon} className="h-5 w-5" />
              Assigned Staff ({assignedStaff.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assignedStaff.map((staffMember) => (
                <div key={staffMember.id} className="flex items-center justify-between border rounded-lg p-3 bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <HugeiconsIcon icon={UserIcon} className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {staffMember.first_name} {staffMember.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{staffMember.email}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {staffMember.role}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
