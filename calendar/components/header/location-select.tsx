import { useCalendar } from "@/calendar/contexts/calendar-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { Location03Icon } from "@hugeicons/core-free-icons";

export function LocationSelect() {
  const { locations = [], selectedLocationId, setSelectedLocationId } = useCalendar();
  const t = useTranslations('Bookings.filters');

  return (
    <Select value={selectedLocationId} onValueChange={(val) => setSelectedLocationId(val as string | "all")}>
      <SelectTrigger className="flex-1 md:w-48 h-10" style={{ borderRadius: '1rem' }}>
        <div className="flex items-center gap-2 truncate">
          <HugeiconsIcon icon={Location03Icon} size={18} className="text-muted-foreground shrink-0" />
          <SelectValue />
        </div>
      </SelectTrigger>

      <SelectContent align="end">
        <SelectItem value="all">
          <div className="flex items-center gap-2">
            {t('allLocations')}
          </div>
        </SelectItem>

        {locations.map(location => (
          <SelectItem key={location.id} value={location.id} className="flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate">{location.name}</p>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
