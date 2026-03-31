"use client";

import { useEffect, useState, useMemo, memo } from "react";
import { useForm } from "react-hook-form";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useCalendar } from "@/calendar/contexts/calendar-context";
import { Input } from "@/components/ui/input";
import { TimeInput } from "@/components/ui/time-input";
import { Time } from "@internationalized/date";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, 
  DialogHeader, 
  DialogContent, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectItem, 
  SelectContent, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { addMinutes, parse } from "date-fns";
import { formatInTimeZone, toDate } from 'date-fns-tz';
import { nl, enUS } from 'date-fns/locale';
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  UserGroupIcon, 
  Calendar01Icon, 
  Clock01Icon, 
  Location01Icon,
  Tick01Icon,
  Alert01Icon,
  Copy01Icon
} from "@hugeicons/core-free-icons";
import { ClientSelectionModal } from "./client-selection-modal";
import { User } from "@/lib/types/user";
import { Location } from "@/lib/types/location_simple";
import { formatEuroCents } from "@/lib/currency/format";
import { 
  Service, 
  Addon, 
  PolicyField, 
  PolicyResponses, 
  AddonSelections 
} from "@/lib/types/booking";
import { 
  normalizeAddons, 
  normalizePolicyFields, 
  calculatePolicyExtraPriceCents, 
  calculateAddonExtraPriceCents,
  buildPolicyAnswerPayload,
  buildAddonPayload
} from "@/components/booking/booking-utils";
import { IEvent } from "@/calendar/interfaces";
import { useTranslations, useLocale } from "next-intl";
import { translateValidationError } from "@/lib/validation/translate-error";

interface IProps {
  children: React.ReactNode;
  startDate?: Date;
  startHour?: number;
  startMinute?: number;
  initialShiftId?: string;
  initialStaffId?: string;
  initialLocationId?: string;
  availableShifts?: IEvent[];
  onBookingCreated?: () => void;
}

interface BookingFormData {
  client_id: string;
  service_id: string;
  location_id: string;
  staff_id: string;
  shift_id: string;
  start_time: string;
  end_time: string;
  due_date: string;
  midwife_id: string;
  is_twin: boolean;
  payment_method: 'online' | 'at_location';
  notes: string;
}

export const AddBookingDialog = memo(function AddBookingDialog({ children, startDate, startHour, startMinute, initialShiftId, initialStaffId, initialLocationId, availableShifts = [], onBookingCreated }: IProps) {
  const t = useTranslations("BookingDialog");
  const tFlow = useTranslations("Booking.flow");
  const locale = useLocale();
  const { isOpen, onClose, onToggle } = useDisclosure();
  const { selectedUserId, users: calendarUsers } = useCalendar();
  const selectedUser = calendarUsers.find(u => u.id === selectedUserId);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  
  const [services, setServices] = useState<Service[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  
  const [selectedAddons, setSelectedAddons] = useState<AddonSelections>({});
  const [policyAnswers, setPolicyAnswers] = useState<PolicyResponses>({});
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingData, setPendingData] = useState<BookingFormData | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const formatDateTimeLocal = (date: Date): string => {
    return formatInTimeZone(date, 'Europe/Amsterdam', "yyyy-MM-dd'T'HH:mm");
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
    getValues,
  } = useForm<BookingFormData>({
    defaultValues: {
      client_id: "",
      service_id: "",
      location_id: initialLocationId || "",
      staff_id: initialStaffId || selectedUser?.id || "",
      shift_id: initialShiftId || "",
      start_time: "",
      end_time: "",
      due_date: "",
      midwife_id: "",
      is_twin: false,
      payment_method: 'online',
      notes: "",
    },
  });

  const watchStartTime = watch("start_time");
  const watchIsTwin = watch("is_twin");
  const watchLocationId = watch("location_id");
  const watchStaffId = watch("staff_id");

  // Filter locations based on available shifts
  const filteredLocations = useMemo(() => {
    if (!availableShifts || availableShifts.length === 0) return locations;
    const shiftLocationIds = new Set(availableShifts.map(s => s.location?.id?.toString()).filter(Boolean));
    return locations.filter(l => shiftLocationIds.has(l.id.toString()));
  }, [locations, availableShifts]);

  // Filter staff based on available shifts and selected location
  const filteredStaff = useMemo(() => {
    if (!availableShifts || availableShifts.length === 0) return calendarUsers;
    
    // First, get all users who have shifts in this 15-min slot
    let relevantShifts = availableShifts;
    
    // If a location is selected, only show staff working at THAT location
    if (watchLocationId) {
      relevantShifts = availableShifts.filter(s => s.location?.id?.toString() === watchLocationId.toString());
    }
    
    const shiftUserIds = new Set(relevantShifts.map(s => s.user?.id?.toString()).filter(Boolean));
    return calendarUsers.filter(u => shiftUserIds.has(u.id.toString()));
  }, [calendarUsers, availableShifts, watchLocationId]);

  // Filter services based on selected staff and time
  const filteredServices = useMemo(() => {
    // 1. Initial filter by staff qualification (database level)
    let availableServices = services;
    if (watchStaffId) {
      // Resolve staff_id from watchStaffId (which is likely a user_id)
      const staffMember = staffMembers.find(s => 
        (s.user_id && s.user_id.toLowerCase() === watchStaffId.toString().toLowerCase()) || 
        (s.id && s.id.toLowerCase() === watchStaffId.toString().toLowerCase())
      );
      
      const effectiveStaffId = staffMember?.id || watchStaffId;

      availableServices = services.filter(s => {
        const hasStaffIds = s.staff_ids && s.staff_ids.length > 0;
        return !hasStaffIds || s.staff_ids?.some(id => id.toLowerCase() === effectiveStaffId.toString().toLowerCase());
      });
    }

    // 2. Secondary filter by shift metadata (if available)
    if (!availableShifts.length) return availableServices;
    
    // Check if the selected staff has any shifts at this time
    const staffShifts = watchStaffId 
      ? availableShifts.filter(s => s.user?.id?.toString() == watchStaffId.toString())
      : availableShifts;
    
    // If no shifts found for this context, we return the qualification-filtered list
    if (staffShifts.length === 0) return availableServices;

    // Combine allowed service IDs from all relevant shifts
    const allowedServiceIds = new Set(staffShifts.flatMap(s => s.metadata?.service_ids || []).map(id => id.toString()));
    
    if (allowedServiceIds.size === 0) {
      const allowedServiceNames = new Set(staffShifts.flatMap(s => s.metadata?.services || []));
      if (allowedServiceNames.size === 0) return availableServices;
      return availableServices.filter(s => allowedServiceNames.has(s.name));
    }

    return availableServices.filter(s => allowedServiceIds.has(s.id.toString()));
  }, [services, watchStaffId, watchLocationId, availableShifts, staffMembers]);

  const handleLocationChange = (locationId: string) => {
    if (!locationId) return;
    setValue("location_id", locationId);
    
    if (!availableShifts || !availableShifts.length) return;

    const availableStaffIdsSet = new Set(availableShifts
      .filter(s => s.location?.id?.toString() === locationId.toString())
      .map(s => s.user?.id?.toString())
      .filter(Boolean));
    
    // Find the first user from calendarUsers who is in the set of available IDs (matches dropdown order)
    const firstStaff = calendarUsers.find(u => availableStaffIdsSet.has(u.id.toString()));
    
    // Unconditionally auto-select the first staff member for this location
    let targetStaffId = getValues("staff_id");
    if (firstStaff) {
      targetStaffId = firstStaff.id;
      setValue("staff_id", targetStaffId, { shouldDirty: true });
    }

    // Sync shift_id
    if (targetStaffId) {
      const matchingShift = availableShifts.find(shift => 
        shift.location?.id?.toString() === locationId.toString() && 
        shift.user?.id?.toString() === targetStaffId.toString()
      );
      if (matchingShift) {
        setValue("shift_id", matchingShift.id.toString(), { shouldDirty: true });
      }
    }
  };

  const handleStaffChange = (staffId: string) => {
    if (!staffId) return;
    setValue("staff_id", staffId);

    if (!availableShifts || !availableShifts.length) return;

    const availableLocationIdsSet = new Set(availableShifts
      .filter(s => s.user?.id?.toString() === staffId.toString())
      .map(s => s.location?.id?.toString())
      .filter(Boolean));
    
    // Find the first location from locations who is in the set of available IDs (matches dropdown order)
    const firstLoc = locations.find(l => availableLocationIdsSet.has(l.id.toString()));

    // Unconditionally auto-select the first location for this staff
    let targetLocId = getValues("location_id");
    if (firstLoc) {
      targetLocId = firstLoc.id;
      setValue("location_id", targetLocId, { shouldDirty: true });
    }

    // Sync shift_id
    if (targetLocId) {
      const matchingShift = availableShifts.find(shift => 
        shift.location?.id?.toString() === targetLocId.toString() && 
        shift.user?.id?.toString() === staffId.toString()
      );
      if (matchingShift) {
        setValue("shift_id", matchingShift.id.toString(), { shouldDirty: true });
      }
    }
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setSelectedClient(null);
      setSelectedService(null);
      setSelectedAddons({});
      setPolicyAnswers({});
      setValue("due_date", "");
      setValue("midwife_id", "");
    }
  }, [isOpen, reset, setValue]);

  // Fetch initial data
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        // Only fetch if we don't have services yet
        if (services.length > 0) return;
        
        setIsLoading(true);
        try {
          const [svcRes, locRes, staffRes] = await Promise.all([
            fetch("/api/services?active_only=true&with_addons=true&limit=1000"),
            fetch("/api/locations-simple?active_only=true&limit=1000"),
            fetch("/api/staff?active_only=true&limit=1000"),
          ]);
          
          const [svcData, locData, staffData] = await Promise.all([
            svcRes.json(), 
            locRes.json(),
            staffRes.json(),
          ]);
          
          if (svcData.success) {
            const rawServices = svcData.data || [];
            const normalized = rawServices.map((s: any) => ({
              ...s,
              id: s.id,
              name: s.name,
              price: s.price,
              duration: s.duration,
              policyFields: normalizePolicyFields(s.policy_fields),
              addons: normalizeAddons(s.addons),
              allowsTwins: !!s.allows_twins,
              twinPrice: s.twin_price,
              twinDurationMinutes: s.twin_duration_minutes,
              staff_ids: s.staff_ids,
              hiddenCheckoutFields: s.hidden_checkout_fields,
            }));
            setServices(normalized);
          }
          if (locData.success) setLocations(locData.data || []);
          if (staffData.success) setStaffMembers(staffData.data || []);
        } catch (err) {
          console.error("Failed to fetch booking data", err);
          toast.error(t("toasts.fetchError"));
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();

      // Set initial time ONLY if not already set
      if (startDate && startHour !== undefined && startMinute !== undefined && !getValues("start_time")) {
        const year = startDate.getFullYear();
        const month = String(startDate.getMonth() + 1).padStart(2, '0');
        const day = String(startDate.getDate()).padStart(2, '0');
        const formattedStart = `${year}-${month}-${day}T${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
        
        setValue("start_time", formattedStart);
        
        // Use a default duration of 60 if no service selected yet
        // Parse the formattedStart as Amsterdam time to calculate the correct end time
        const start = toDate(formattedStart, { timeZone: 'Europe/Amsterdam' });
        const end = addMinutes(start, 60);
        setValue("end_time", formatDateTimeLocal(end));
      }
    }
  }, [isOpen, startDate, startHour, startMinute, setValue, getValues, services.length]);

  // Update end time when service or start time changes
  useEffect(() => {
    if (selectedService && watchStartTime) {
      const start = toDate(watchStartTime, { timeZone: 'Europe/Amsterdam' });
      let duration = selectedService.duration || 60;
      if (watchIsTwin && selectedService.allowsTwins) {
        // Fallback to double duration if twinDurationMinutes is null
        duration = selectedService.twinDurationMinutes ?? (duration * 2);
      }
      const end = addMinutes(start, duration);
      setValue("end_time", formatDateTimeLocal(end));
    }
  }, [selectedService, watchStartTime, watchIsTwin, setValue]);

  // Calculate live total price
  const grandTotalCents = useMemo(() => {
    if (!selectedService) return 0;
    
    // Base Price
    let basePriceCents = (selectedService.price ?? 0) * 100;
    if (watchIsTwin && selectedService.allowsTwins) {
      if (selectedService.twinPrice) {
        basePriceCents = selectedService.twinPrice * 100;
      } else {
        basePriceCents *= 2;
      }
    }

    const addonPriceCents = calculateAddonExtraPriceCents(selectedService.addons, selectedAddons);
    const policyPriceCents = calculatePolicyExtraPriceCents(selectedService.policyFields, policyAnswers);

    return basePriceCents + addonPriceCents + policyPriceCents;
  }, [selectedService, watchIsTwin, selectedAddons, policyAnswers]);

  const handleClientSelect = (client: User) => {
    setSelectedClient(client);
    setValue("client_id", client.id);
    setValue("midwife_id", client.midwife_id || "");
    setIsClientModalOpen(false);
  };

  const handleServiceChange = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    setSelectedService(service || null);
    setValue("service_id", serviceId);
    // Reset options
    setSelectedAddons({});
    setPolicyAnswers({});
  };

  const togglePolicyMultiChoice = (fieldId: string, choiceId: string) => {
    setPolicyAnswers(prev => {
      const current = Array.isArray(prev[fieldId]) ? (prev[fieldId] as string[]) : [];
      if (current.includes(choiceId)) {
        return { ...prev, [fieldId]: current.filter(id => id !== choiceId) };
      } else {
        return { ...prev, [fieldId]: [...current, choiceId] };
      }
    });
  };

  const renderPolicyField = (field: any) => {
    const value = policyAnswers[field.id];
    
    switch (field.field_type) {
      case 'checkbox':
        return (
          <div key={field.id} className="flex items-start gap-2 border p-2 rounded-md bg-card" style={{borderRadius: '0.5rem'}}>
            <Checkbox 
              id={`policy-${field.id}`}
              className="mt-1"
              checked={!!value}
              onCheckedChange={(val) => setPolicyAnswers({...policyAnswers, [field.id]: !!val})}
            />
            <div className="space-y-1">
              <Label htmlFor={`policy-${field.id}`} className="text-sm cursor-pointer font-medium leading-none">
                {field.title} {field.is_required && "*"}
              </Label>
              {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
            </div>
          </div>
        );
      
      case 'multi_choice':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="text-sm font-medium">{field.title} {field.is_required && "*"}</Label>
            {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
            <div className="grid grid-cols-1 gap-2">
              {field.choices?.map((choice: any) => (
                <div key={choice.id} className="flex items-center gap-2 border p-2 rounded-md bg-card" style={{borderRadius: "0.5rem"}}>
                  <Checkbox 
                    id={`choice-${choice.id}`}
                    checked={Array.isArray(value) && value.includes(choice.id)}
                    onCheckedChange={() => togglePolicyMultiChoice(field.id, choice.id)}
                  />
                  <Label htmlFor={`choice-${choice.id}`} className="text-sm cursor-pointer flex-1 flex justify-between">
                    <span>{choice.title}</span>
                    {choice.price > 0 && <span className="text-primary font-medium">+{formatEuroCents(choice.price * 100)}</span>}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );

      case 'date_time':
        return (
          <div key={field.id} className="space-y-1">
            <Label className="text-sm font-medium">{field.title} {field.is_required && "*"}</Label>
            {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
            <Input 
              type="datetime-local"
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => setPolicyAnswers({...policyAnswers, [field.id]: e.target.value})}
            />
          </div>
        );

      case 'number_input':
        return (
          <div key={field.id} className="space-y-1">
            <Label className="text-sm font-medium">{field.title} {field.is_required && "*"}</Label>
            {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
            <Input 
              type="number"
              placeholder={field.description || t("policyFields.numberPlaceholder")}
              value={typeof value === 'number' ? value : ''}
              onChange={(e) => setPolicyAnswers({...policyAnswers, [field.id]: e.target.value === '' ? null : Number(e.target.value)})}
            />
          </div>
        );

      case 'text_input':
      default:
        return (
          <div key={field.id} className="space-y-1">
            <Label className="text-sm font-medium">{field.title} {field.is_required && "*"}</Label>
            {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
            <Input 
              placeholder={field.description || t("policyFields.textPlaceholder")}
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => setPolicyAnswers({...policyAnswers, [field.id]: e.target.value})}
            />
          </div>
        );
    }
  };
  // Helper to create true ISO string from local YYYY-MM-DDTHH:mm keeping Europe/Amsterdam offset
  const createLocalIsoString = (localDateTimeStr: string): string => {
    const amsterdamDate = toDate(`${localDateTimeStr}:00`, { timeZone: 'Europe/Amsterdam' });
    return formatInTimeZone(amsterdamDate, 'Europe/Amsterdam', "yyyy-MM-dd'T'HH:mm:ssXXX");
  };

  const executeBooking = async (data: BookingFormData, isForce?: boolean) => {
    setIsSubmitting(true);
    try {
      const addons = buildAddonPayload(selectedService?.addons || [], selectedAddons);
      const policyAnswersPayload = buildPolicyAnswerPayload(selectedService?.policyFields || [], policyAnswers);

      const res = await fetch("/api/bookings/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Map snake_case (form) to camelCase (API)
          clientId: selectedClient!.id,
          serviceId: data.service_id,
          locationId: data.location_id,
          staffId: data.staff_id,
          shiftId: data.shift_id,
          startTime: createLocalIsoString(data.start_time),
          endTime: createLocalIsoString(data.end_time),
          isTwin: data.is_twin,
          notes: data.notes,
          payment_method: grandTotalCents > 0 ? data.payment_method : 'at_location',
          
          // Map client contact info
          clientEmail: selectedClient!.email,
          firstName: selectedClient!.first_name || "",
          lastName: selectedClient!.last_name || "",
          phone: selectedClient!.phone || "",
          
          // Inject other client fields from profile
          birthDate: selectedClient!.birth_date || "",
          address: selectedClient!.address || "",
          postalCode: selectedClient!.postal_code || "",
          houseNumber: selectedClient!.house_number || "",
          streetName: selectedClient!.street_name || "",
          city: selectedClient!.city || "",
          midwifeId: data.midwife_id || "",
          
          // Technical fields
          priceEurCents: grandTotalCents,
          addons,
          policyAnswers: policyAnswersPayload,
          
          dueDate: data.due_date,
          force: isForce,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || t("toasts.error"));

      if (result.checkoutUrl) {
        setCheckoutUrl(result.checkoutUrl);
        setShowSuccess(true);
      } else {
        toast.success(t("toasts.success"));
      }
      
      onClose();
      reset();
      setSelectedClient(null);
      setShowWarning(false);
      setConflicts([]);
      setPendingData(null);
      if (onBookingCreated) onBookingCreated();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("toasts.error");
      toast.error(translateValidationError(msg, tFlow));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (data: BookingFormData) => {
    if (!selectedClient) {
      toast.error(t("validation.clientRequired"));
      return;
    }

    if (selectedService) {
      // Validate policy fields
      for (const field of selectedService.policyFields) {
        if (field.is_required) {
          const value = policyAnswers[field.id];
          const isEmpty = 
            value === undefined || 
            value === null || 
            (typeof value === 'string' && value.trim() === '') ||
            (Array.isArray(value) && value.length === 0);
          
          if (isEmpty) {
            toast.error(t("validation.fieldRequired", { fieldName: field.title }));
            return;
          }
        }
      }
    }

    if (!selectedService?.hiddenCheckoutFields?.includes('due_date') && !data.due_date) {
      toast.error(t("validation.dueDateRequired"));
      setDueDateOpen(true);
      return;
    }

    // Check for conflicts
    setIsSubmitting(true);
    try {
      const conflictRes = await fetch("/api/availability/check-conflicts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: createLocalIsoString(data.start_time),
          endTime: createLocalIsoString(data.end_time),
          staffId: data.staff_id,
          locationId: data.location_id,
          serviceId: data.service_id,
        }),
      });
      
      const { conflicts: foundConflicts } = await conflictRes.json();
      
      if (foundConflicts && foundConflicts.length > 0) {
        setConflicts(foundConflicts);
        setPendingData(data);
        setShowWarning(true);
        setIsSubmitting(false);
        return;
      }
    } catch (err) {
      console.error("Conflict check failed", err);
    }

    await executeBooking(data);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onToggle}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-2xl max-w-2xl max-h-[90vh] h-full flex flex-col p-0 overflow-hidden" style={{borderRadius: "0.5rem"}}>
          <DialogHeader className="p-6 pb-4 border-b bg-card">
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-6 space-y-6">
              <form id="add-booking-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Client Selection */}
                <div className="space-y-2">
                  <Label>{t("client")}</Label>
                  <div className="flex gap-2">
                    <Button type="button" className="w-[120px] shrink-0 bg-secondary text-foreground hover:text-white px-4 ring-0 outline-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none" style={{ borderRadius: '0.5rem' }} onClick={() => setIsClientModalOpen(true)}>
                      {t("browse")}
                    </Button>
                    <div className="flex-1 border h-10 rounded-md bg-card px-3 py-2 flex items-center gap-2" style={{borderRadius: "0.5rem"}}>
                      <HugeiconsIcon icon={UserGroupIcon} size={18} className="text-muted-foreground" />
                      {selectedClient ? (
                        <span className="font-medium truncate">{selectedClient.first_name} {selectedClient.last_name}</span>
                      ) : (
                        <span className="text-muted-foreground italic">{t("noClient")}</span>
                      )}
                    </div>

                    {!selectedService?.hiddenCheckoutFields?.includes('due_date') && (
                      <div className="w-[140px] shrink-0">
                        <Popover modal={true} open={dueDateOpen} onOpenChange={setDueDateOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal h-10 px-3 border-input bg-card ring-0 outline-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none truncate",
                                !watch("due_date") && "text-muted-foreground",
                                errors.due_date && "border-red-500"
                              )}
                              style={{ borderRadius: '0.5rem' }}
                            >
                              <HugeiconsIcon icon={Calendar01Icon} size={18} className="mr-2 h-4 w-4 shrink-0" />
                              <span className="truncate">
                                {watch("due_date") ? formatInTimeZone(new Date(watch("due_date")), 'Europe/Amsterdam', "dd/MM/yyyy") : t("dueDate")}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                              mode="single"
                              captionLayout="dropdown"
                              fromYear={new Date().getFullYear()}
                              toYear={new Date().getFullYear() + 2}
                              selected={watch("due_date") ? new Date(watch("due_date")) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  setValue("due_date", date.toISOString(), { shouldValidate: true });
                                  setDueDateOpen(false);
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </div>
                  {errors.client_id && <p className="text-xs text-red-500 font-medium">{t("validation.clientRequired")}</p>}
                  {!selectedService?.hiddenCheckoutFields?.includes('due_date') && errors.due_date && (
                    <p className="text-xs text-red-500 font-medium">{t("validation.dueDateRequired")}</p>
                  )}
                </div>

                

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("location")}</Label>
                    <Select onValueChange={handleLocationChange} value={watch("location_id")}>
                      <SelectTrigger className="h-10 rounded-md bg-card px-3 py-2 flex items-center gap-2" style={{borderRadius: "0.5rem"}}>
                        <SelectValue placeholder={t("selectLocation")} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredLocations.map(l => (
                          <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("staff")}</Label>
                    <Select onValueChange={handleStaffChange} value={watch("staff_id")}>
                      <SelectTrigger className="h-10 rounded-md bg-card px-3 py-2 flex items-center gap-2" style={{borderRadius: "0.5rem"}}>
                        <SelectValue placeholder={t("selectStaff")} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredStaff.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>



{/* Service Selection */}
                {watchStaffId && (
                  <div className="space-y-2">
                    <Label>{t("service")}</Label>
                    <Select onValueChange={handleServiceChange} value={watch("service_id")}>
                      <SelectTrigger className="h-10 rounded-md bg-card px-3 py-2 flex items-center gap-2" style={{borderRadius: "0.5rem"}}>
                        <SelectValue placeholder={t("selectService")} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredServices.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}




              {/* Time Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("startDate")}</Label>
                  <div className="flex gap-1">
                    <Popover modal={true} open={startDateOpen} onOpenChange={setStartDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "justify-start text-left font-normal h-10 px-3 border-input bg-card flex-1",
                            !watch("start_time") && "text-muted-foreground"
                          )}
                          style={{ borderRadius: '0.5rem' }}
                        >
                          <HugeiconsIcon icon={Calendar01Icon} size={18} className="mr-2" />
                          {watch("start_time") ? formatInTimeZone(new Date(watch("start_time")), 'Europe/Amsterdam', "dd/MM/yyyy") : <span>{t("selectDate")}</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={watch("start_time") ? new Date(watch("start_time")) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const current = watch("start_time") ? new Date(watch("start_time")) : new Date();
                              date.setHours(current.getHours(), current.getMinutes());
                              setValue("start_time", formatDateTimeLocal(date));
                              setStartDateOpen(false);

                              // Update end date to match
                              if (watch("end_time")) {
                                const end = new Date(watch("end_time"));
                                const newEndDate = new Date(date);
                                newEndDate.setHours(end.getHours(), end.getMinutes());
                                setValue("end_time", formatDateTimeLocal(newEndDate));
                              }
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <TimeInput
                      className="w-[100px]"
                      hourCycle={24}
                      value={watch("start_time") ? new Time(new Date(watch("start_time")).getHours(), new Date(watch("start_time")).getMinutes()) : null}
                      onChange={(time) => {
                        if (time) {
                          const date = watch("start_time") ? new Date(watch("start_time")) : new Date();
                          date.setHours(time.hour, time.minute);
                          setValue("start_time", formatDateTimeLocal(date));
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("endDate")}</Label>
                  <div className="flex gap-1">
                    <Popover modal={true} open={endDateOpen} onOpenChange={setEndDateOpen}>
                      <PopoverTrigger asChild className="hidden">
                        <Button
                          variant={"outline"}
                          className={cn(
                            "justify-start text-left font-normal h-10 px-3 border-input bg-card flex-1",
                            !watch("end_time") && "text-muted-foreground"
                          )}
                          style={{ borderRadius: '0.5rem' }}
                        >
                          <HugeiconsIcon icon={Calendar01Icon} size={18} className="mr-2" />
                          {watch("end_time") ? formatInTimeZone(new Date(watch("end_time")), 'Europe/Amsterdam', "dd/MM/yyyy") : <span>{t("selectDate")}</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={watch("end_time") ? new Date(watch("end_time")) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const current = watch("end_time") ? new Date(watch("end_time")) : new Date();
                              date.setHours(current.getHours(), current.getMinutes());
                              setValue("end_time", formatDateTimeLocal(date));
                              setEndDateOpen(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <TimeInput
                      className="w-[100px]"
                      hourCycle={24}
                      value={watch("end_time") ? new Time(new Date(watch("end_time")).getHours(), new Date(watch("end_time")).getMinutes()) : null}
                      onChange={(time) => {
                        if (time) {
                          const date = watch("end_time") ? new Date(watch("end_time")) : new Date();
                          date.setHours(time.hour, time.minute);
                          setValue("end_time", formatDateTimeLocal(date));
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Complex Options: Twins, Addons, Policies */}
              {selectedService && (
                <div className="space-y-4 border-t pt-4">
                  
                  {selectedService.allowsTwins && (
                    <>
                    <h3 className="font-semibold text-xs flex uppercase tracking-wider items-center gap-2">
                    {t("serviceOptions")}
                  </h3>
                    <div className="flex items-center gap-2 bg-card p-3 rounded-lg border border-input" style={{borderRadius: "0.5rem"}}>
                      <Checkbox 
                        id="is_twin" 
                        checked={watchIsTwin} 
                        onCheckedChange={(val) => setValue("is_twin", val === true)} 
                      />
                      <Label htmlFor="is_twin" className="cursor-pointer">
                        {t("isTwin")}
                        {/* (+{selectedService.twinDurationMinutes ? selectedService.twinDurationMinutes - selectedService.duration : 0}m) */}
                        </Label>
                    </div>
                    </>
                  )}

                  {selectedService.addons && selectedService.addons.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider">{t("addons")}</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedService.addons.map(addon => (
                          <div key={addon.id} className="flex items-center gap-2 border p-2 rounded-md bg-card" style={{borderRadius: "0.5rem"}}>
                            <Checkbox 
                              id={`addon-${addon.id}`}
                              checked={!!selectedAddons[addon.id]}
                              onCheckedChange={(val) => setSelectedAddons({...selectedAddons, [addon.id]: !!val})}
                            />
                            <Label htmlFor={`addon-${addon.id}`} className="text-sm cursor-pointer truncate">
                              {addon.name} ({formatEuroCents(addon.priceCents)})
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedService.policyFields && selectedService.policyFields.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-xs font-semibold uppercase tracking-wider">{t("policyQuestions")}</Label>
                      {selectedService.policyFields.map((field: PolicyField) => renderPolicyField(field))}
                    </div>
                  )}
                </div>
              )}

              {/* Payment Method */}
              {grandTotalCents > 0 && (
                <div className="space-y-3 border-t pt-4">
                  <Label>{t("paymentMethod")}</Label>
                  <div className="flex gap-4">
                    <div style={{borderRadius: '0.5rem'}} className={`flex-1 border rounded-lg p-2 cursor-pointer transition-colors ${watch("payment_method") === 'online' ? 'border-secondary bg-accent' : 'hover:bg-muted'}`}
                         onClick={() => setValue("payment_method", 'online')}>
                      <div className="flex justify-between items-center">
                        {/* <span className="font-medium">{t("paymentOnline")}</span> */}
                        {watch("payment_method") === 'online' && <HugeiconsIcon icon={Tick01Icon} className="text-primary" size={18} />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 text-balance">{t("paymentOnlineDesc")}</p>
                    </div>
                    {/* <div style={{borderRadius: '0.5rem'}} className={`flex-1 border rounded-lg p-2 cursor-pointer transition-colors ${watch("payment_method") === 'at_location' ? 'border-secondary bg-accent' : 'hover:bg-muted'}`}
                         onClick={() => setValue("payment_method", 'at_location')}>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{t("paymentLocation")}</span>
                        {watch("payment_method") === 'at_location' && <HugeiconsIcon icon={Tick01Icon} className="text-primary" size={18} />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 text-balance">{t("paymentLocationDesc")}</p>
                    </div> */}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>{t("notes")}</Label>
                <textarea 
                  {...register("notes")}
                  className="w-full min-h-[80px] border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t("notesPlaceholder")}
                  style={{ borderRadius: '0.5rem' }}
                />
              </div>

            </form>
          </div>
        </div>

        <DialogFooter className="p-6 py-4 border-t bg-card items-center justify-between flex-row gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{t("grandTotal")}</span>
            <span className="text-xl font-black text-primary leading-tight">
              {grandTotalCents > 0 
                ? formatEuroCents(grandTotalCents) 
                : (selectedService?.customPriceLabel || formatEuroCents(0))}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={() => onToggle()} style={{borderRadius: "0.5rem"}}>{t("cancel")}</Button>
            <Button 
              type="submit" 
              form="add-booking-form"
              disabled={isSubmitting || !selectedClient || !watch("service_id")}
              style={{borderRadius: "0.5rem"}}
            >
              {isSubmitting ? t("creating") : t("create")}
            </Button>
          </div>
        </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClientSelectionModal 
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSelect={handleClientSelect}
      />

      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent className="sm:max-w-md" style={{borderRadius: "0.5rem"}}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <HugeiconsIcon icon={Alert01Icon} size={20} />
              {t("warnings.title")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("warnings.description")}
            </p>
            <div className="space-y-2 bg-muted p-3 rounded-lg border border-dashed text-sm">
              {conflicts.map((c, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>
                    {c.type === 'blackout' && t("warnings.conflicts.blackout", { name: c.name })}
                    {c.type === 'break' && t("warnings.conflicts.break", { name: c.name })}
                    {c.type === 'booking' && t("warnings.conflicts.booking", { details: c.details })}
                    {c.type === 'no_shift' && t("warnings.conflicts.noShift")}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="sm:justify-between flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setShowWarning(false);
                setConflicts([]);
                setPendingData(null);
              }}
              style={{borderRadius: "0.5rem"}}
            >
              {t("cancel")}
            </Button>
            <Button 
              type="button"
              className="bg-secondary hover:bg-accent text-foreground"
              onClick={() => {
                if (pendingData) {
                  const hasNoShift = conflicts.some(c => c.type === 'no_shift');
                  executeBooking(pendingData, hasNoShift);
                }
              }}
              disabled={isSubmitting}
              style={{borderRadius: "0.5rem"}}
            >
              {isSubmitting ? t("creating") : t("warnings.continue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
         <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              
            </DialogTitle>
          </DialogHeader>
        <DialogContent className="max-w-2xl sm:max-w-[44rem] p-0 overflow-hidden" style={{borderRadius: "1rem"}}>
          <div className="w-full p-8 text-center bg-primary/5 border-b space-y-4 pt-12 box-border">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
              <HugeiconsIcon icon={Tick01Icon} size={32} />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-primary leading-tight">{t("success.title")}</h2>
              <p className="text-sm text-balance text-muted-foreground px-4">
                {t("success.description")}
              </p>
            </div>
          </div>

          <div className="w-full p-6 space-y-6 box-border">
            {checkoutUrl && (
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
                  {t("success.paymentLink")}
                </Label>
                <div className="flex gap-2 w-full">
                  <div className="flex-1 min-w-0 bg-muted/50 p-3 rounded-lg text-xs font-mono border border-input leading-none flex items-center">
                    <span className="truncate w-full">{checkoutUrl}</span>
                  </div>
                  <Button 
                    type="button" 
                    size="icon" 
                    variant="outline" 
                    onClick={() => {
                      navigator.clipboard.writeText(checkoutUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className={`h-10 w-10 shrink-0 ${copied ? "text-primary border-primary bg-primary/5" : "hover:border-primary hover:text-primary transition-colors"}`}
                    style={{borderRadius: "0.75rem"}}
                  >
                    <HugeiconsIcon icon={copied ? Tick01Icon : Copy01Icon} size={20} />
                  </Button>
                </div>
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1 h-1 shrink-0 rounded-full bg-primary/40" />
                  <p className="text-[11px] text-muted-foreground font-medium italic leading-tight">
                    {t("success.copyHint")}
                  </p>
                </div>
              </div>
            )}

            <Button 
              type="button" 
              className="w-full h-12 bg-secondary hover:text-white transition-opacity text-foreground font-semibold text-base shadow-lg shadow-secondary/20" 
              onClick={() => setShowSuccess(false)}
              style={{borderRadius: "0.75rem"}}
            >
              {t("success.done")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});
