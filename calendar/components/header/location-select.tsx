import { useCalendar } from "@/calendar/contexts/calendar-context";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from "next-intl";

export function LocationSelect() {
  const { locations, selectedLocationId, setSelectedLocationId } = useCalendar();
  const t = useTranslations('Bookings.filters');

  // Do not render if locations are not provided or empty (e.g., when not fetched)
  if (!locations || locations.length === 0) return null;

  return (
    <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
      <SelectTrigger className="flex-1 md:w-48 h-10" style={{borderRadius: '1rem'}}>
        <SelectValue placeholder={t('location', { fallback: 'Location' })} />
      </SelectTrigger>

      <SelectContent align="end">
        <SelectItem value="all">
          <div className="flex items-center gap-1">
            {t('allLocations', { fallback: 'All Locations' })}
          </div>
        </SelectItem>

        {locations.map(loc => (
          <SelectItem key={loc.id} value={loc.id} className="flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate">{loc.name}</p>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
