'use client';

import { Badge } from '@/components/ui/badge';
import { HugeiconsIcon } from '@hugeicons/react';
import { MailIcon, CallIcon, BuildingIcon } from '@hugeicons/core-free-icons';
import { Midwife, getMidwifeDisplayName, getMidwifeFullDisplay } from '@/lib/types/midwife';

interface MidwifeViewProps {
  midwife: Midwife;
}

export default function MidwifeView({ midwife }: MidwifeViewProps) {
  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Name</p>
              <p className="text-sm font-medium">{getMidwifeDisplayName(midwife)}</p>
            </div>
            {midwife.practice_name && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Practice</p>
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={BuildingIcon} className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm">{midwife.practice_name}</p>
                </div>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <Badge variant={midwife.is_active ? 'default' : 'secondary'}>
                {midwife.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        {(midwife.email || midwife.phone) && (
          <div>
            <h3 className="text-sm font-semibold mb-4">Contact Information</h3>
            <div className="space-y-3">
              {midwife.email && (
                <div className="flex items-center gap-3">
                  <HugeiconsIcon icon={MailIcon} className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm">{midwife.email}</p>
                  </div>
                </div>
              )}
              {midwife.phone && (
                <div className="flex items-center gap-3">
                  <HugeiconsIcon icon={CallIcon} className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm">{midwife.phone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div>
          <h3 className="text-sm font-semibold mb-4">Metadata</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Created</p>
              <p className="text-sm">
                {new Date(midwife.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
              <p className="text-sm">
                {new Date(midwife.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}





