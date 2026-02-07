'use client';

import { useState, useEffect, FocusEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { Service, ServicePolicyField, ServiceCategory } from '@/lib/types/service';
import { Staff } from '@/lib/types/staff';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';
import { ServiceAddon } from '@/lib/types/service';
import { toast } from 'sonner';
import { ServiceRepeatManager } from './service-repeat-manager';

interface ServiceFormProps {
  service?: Service;
  onSave: (service: ServiceFormData) => void;
  onCancel: () => void;
  isViewMode?: boolean;
}

interface ServiceFormData {
  name: string;
  serviceCode: string;
  description: string;
  duration: number;
  buffer_time: number;
  lead_time: number;
  reschedule_cutoff: number;
  instructions: string;
  price: number;
  sale_price: number | null;
  cancel_cutoff: number | null;
  scheduling_window: number;
  category_id: string | null;
  policy_fields: ServicePolicyField[];
  staff_ids: string[];
  allows_twins: boolean;
  is_active: boolean;
}

const generateServiceCode = (name: string): string => {
  const alphanumeric = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return alphanumeric.slice(0, 3);
};

// Sortable Field Component
function SortableField({
  field,
  index,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onRemove
}: {
  field: ServicePolicyField;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (field: ServicePolicyField) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('Services.form.fields');
  const tCommon = useTranslations('Common');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-lg bg-background ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab hover:cursor-grabbing p-1 rounded hover:bg-muted"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
            {index + 1}
          </div>
          <div>
            <h4 className="font-medium">
              {field.title || `Field ${index + 1}`}
              <span className="text-sm text-muted-foreground ml-2">
                ({field.field_type.replace('_', ' ')})
              </span>
            </h4>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRemove}
          >
            {tCommon('delete')}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            {/* Field Title */}
            <div>
              <Label htmlFor={`field_title_${index}`}>{t('title')}</Label>
              <Input
                id={`field_title_${index}`}
                value={field.title}
                onChange={(e) => onUpdate({ ...field, title: e.target.value })}
                placeholder={t('titlePlaceholder')}
              />
            </div>

            {/* Field Description */}
            <div>
              <Label htmlFor={`field_description_${index}`}>{t('description')}</Label>
              <Input
                id={`field_description_${index}`}
                value={field.description || ''}
                onChange={(e) => onUpdate({ ...field, description: e.target.value })}
                placeholder={t('descriptionPlaceholder')}
              />
            </div>

            {/* Required Switch */}
            <div className="flex items-center space-x-2">
              <Switch
                id={`field_required_${index}`}
                checked={field.is_required}
                onCheckedChange={(checked) => onUpdate({ ...field, is_required: checked })}
              />
              <Label htmlFor={`field_required_${index}`}>{t('required')}</Label>
            </div>

            {/* Multi Choice Options */}
            {field.field_type === 'multi_choice' && (
              <div className="md:col-span-2">
                <Label>{t('choices')}</Label>
                <div className="space-y-2 mt-2">
                  {field.choices?.map((choice, choiceIndex) => (
                    <div key={choice.id} className="flex items-center gap-2">
                      <Input
                        placeholder={t('choiceTitle')}
                        value={choice.title}
                        onChange={(e) => {
                          const newChoices = [...(field.choices || [])];
                          newChoices[choiceIndex].title = e.target.value;
                          onUpdate({ ...field, choices: newChoices });
                        }}
                        className="flex-1"
                      />
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">€</span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={choice.price}
                          onChange={(e) => {
                            const newChoices = [...(field.choices || [])];
                            newChoices[choiceIndex].price = parseFloat(e.target.value) || 0;
                            onUpdate({ ...field, choices: newChoices });
                          }}
                          className="w-24 pl-7"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newChoices = (field.choices || []).filter((_, i) => i !== choiceIndex);
                          onUpdate({ ...field, choices: newChoices });
                        }}
                      >
                        {t('remove')}
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newChoices = [...(field.choices || [])];
                      newChoices.push({
                        id: `temp_choice_${Date.now()}`,
                        field_id: field.id,
                        title: '',
                        price: 0,
                        order: newChoices.length,
                      });
                      onUpdate({ ...field, choices: newChoices });
                    }}
                  >
                    {t('addChoice')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Addons Manager Component
function AddonsManager({ serviceId }: { serviceId?: string }) {
  const t = useTranslations('Services.form.addons');
  const tCommon = useTranslations('Common');
  const [addons, setAddons] = useState<ServiceAddon[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '0',
    is_required: false,
    is_active: true,
  });

  const fetchAddons = async () => {
    if (!serviceId) {
      setAddons([]);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/services/${serviceId}/addons`);
      const data = await response.json();

      if (data.success) {
        setAddons(data.data || []);
      } else {
        toast.error(t('loadError'), {
          description: data.error || 'Unknown error',
        });
      }
    } catch (error) {
      toast.error(t('loadError'), {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '0',
      is_required: false,
      is_active: true,
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleAdd = () => {
    resetForm();
    setIsAdding(true);
  };

  const handleEdit = (addon: ServiceAddon) => {
    setFormData({
      name: addon.name,
      description: addon.description || '',
      price: addon.price.toString(),
      is_required: addon.is_required,
      is_active: addon.is_active,
    });
    setEditingId(addon.id);
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!serviceId) {
      toast.error(t('serviceIdRequired'));
      return;
    }

    if (!formData.name.trim()) {
      toast.error(t('addonNameRequired'));
      return;
    }

    try {
      const price = parseFloat(formData.price) || 0;
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price,
        is_required: formData.is_required,
        is_active: formData.is_active,
      };

      if (editingId) {
        // Update existing addon
        const response = await fetch(`/api/services/addons/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (data.success) {
          toast.success(t('updateSuccess'));
          resetForm();
          fetchAddons();
        } else {
          toast.error(t('updateError'), {
            description: data.error || 'Unknown error',
          });
        }
      } else {
        // Create new addon
        const response = await fetch(`/api/services/${serviceId}/addons`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (data.success) {
          toast.success(t('createSuccess'));
          resetForm();
          fetchAddons();
        } else {
          toast.error(t('createError'), {
            description: data.error || 'Unknown error',
          });
        }
      }
    } catch (error) {
      toast.error(t('saveError'), {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) {
      return;
    }

    try {
      const response = await fetch(`/api/services/addons/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t('deleteSuccess'));
        fetchAddons();
      } else {
        toast.error(t('deleteError'), {
          description: data.error || 'Unknown error',
        });
      }
    } catch (error) {
      toast.error(t('deleteError'), {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  if (!serviceId) {
    return (
      <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
        <p className="text-sm">{t('saveServiceFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{t('title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        <Button type="button" onClick={handleAdd} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          {t('add')}
        </Button>
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <div className="border rounded-lg p-4 bg-muted/50 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{editingId ? t('edit') : t('new')}</h4>
            <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
              {tCommon('cancel')}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="addon-name">{t('name')}</Label>
              <Input
                id="addon-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('namePlaceholder')}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="addon-description">{t('description')}</Label>
              <Textarea
                id="addon-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('descriptionPlaceholder')}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="addon-price">{t('price')}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">€</span>
                <Input
                  id="addon-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="addon-required"
                  checked={formData.is_required}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
                />
                <Label htmlFor="addon-required" className="cursor-pointer">
                  {t('required')}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="addon-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="addon-active" className="cursor-pointer">
                  {t('active')}
                </Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={resetForm}>
              {tCommon('cancel')}
            </Button>
            <Button type="button" onClick={handleSave}>
              {editingId ? t('update') : t('create')}
            </Button>
          </div>
        </div>
      )}

      {/* Addons List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-muted-foreground">{t('loading')}</div>
        </div>
      ) : addons.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          <p className="text-sm">{t('listEmpty')}</p>
          <p className="text-xs mt-1">{t('listEmptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {addons.map((addon) => (
            <div
              key={addon.id}
              className="border rounded-lg p-4 flex items-start justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{addon.name}</span>
                  {addon.is_required && (
                    <Badge variant="secondary" className="text-xs">{t('requiredBadge')}</Badge>
                  )}
                  {!addon.is_active && (
                    <Badge variant="outline" className="text-xs">{t('inactive')}</Badge>
                  )}
                </div>
                {addon.description && (
                  <p className="text-sm text-muted-foreground">{addon.description}</p>
                )}
                <p className="text-sm font-medium">€{addon.price.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(addon)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(addon.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ServiceForm({ service, onSave, onCancel, isViewMode = false }: ServiceFormProps) {
  const t = useTranslations('Services.form');
  const tCommon = useTranslations('Common');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);
  const [hasCustomServiceCode, setHasCustomServiceCode] = useState(false);

  // Wizard State
  const [activeTab, setActiveTab] = useState('details');
  const tabs = ['details', 'pricing', 'advanced', 'policy', 'staff', 'repeats', 'addons'];
  const isFirstStep = activeTab === tabs[0];
  const isLastStep = activeTab === tabs[tabs.length - 1];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
    setValue,
    trigger
  } = useForm<ServiceFormData>({
    defaultValues: {
      name: '',
      serviceCode: '',
      description: '',
      duration: 30,
      buffer_time: 0,
      lead_time: 0,
      reschedule_cutoff: 24,
      instructions: '',
      price: 0,
      sale_price: null,
      cancel_cutoff: null,
      scheduling_window: 12,
      category_id: null,
      policy_fields: [],
      staff_ids: [],
      allows_twins: false,
      is_active: true,
    },
  });

  const serviceCodeRegister = register('serviceCode', {
    validate: (value) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return 'Service code is required';
      }
      return /^[A-Z0-9]{3}$/.test(trimmed) || 'Service code must be exactly 3 letters or numbers';
    },
  });

  // Reset form when service changes
  useEffect(() => {
    if (service) {
      reset({
        name: service.name,
        serviceCode: service.serviceCode || generateServiceCode(service.name),
        description: service.description || '',
        duration: service.duration,
        buffer_time: service.buffer_time,
        lead_time: service.lead_time,
        reschedule_cutoff: service.reschedule_cutoff,
        instructions: service.instructions || '',
        price: service.price,
        sale_price: service.sale_price,
        cancel_cutoff: service.cancel_cutoff,
        scheduling_window: service.scheduling_window,
        category_id: service.category_id,
        policy_fields: service.policy_fields || [],
        staff_ids: service.staff_ids || [],
        allows_twins: service.allows_twins || false,
        is_active: service.is_active,
      });
      setHasCustomServiceCode(Boolean(service.serviceCode));
    } else {
      reset({
        name: '',
        serviceCode: '',
        description: '',
        duration: 30,
        buffer_time: 0,
        lead_time: 0,
        reschedule_cutoff: 24,
        instructions: '',
        price: 0,
        sale_price: null,
        cancel_cutoff: null,
        scheduling_window: 12,
        category_id: null,
        policy_fields: [],
        staff_ids: [],
        allows_twins: false,
        is_active: true,
      });
      setHasCustomServiceCode(false);
    }
  }, [service, reset]);

  // Fetch categories and staff on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const categoriesResponse = await fetch('/api/service-categories');
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setCategories(categoriesData.data || []);
        }

        // Fetch staff
        const staffResponse = await fetch('/api/staff?active_only=true');
        if (staffResponse.ok) {
          const staffData = await staffResponse.json();
          setStaff(staffData.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
  }, []);

  const onSubmit = async (data: ServiceFormData) => {
    setIsSubmitting(true);
    try {
      const sanitizedUserCode = data.serviceCode
        ? data.serviceCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3)
        : '';
      const generatedCode = generateServiceCode(data.name);
      const finalServiceCode = sanitizedUserCode || generatedCode;
      const submissionData: ServiceFormData = {
        ...data,
        serviceCode: finalServiceCode,
      };
      setHasCustomServiceCode(Boolean(sanitizedUserCode));
      setValue('serviceCode', finalServiceCode);
      await onSave(submissionData);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Drag and drop handlers
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = watch('policy_fields').findIndex((field) => field.id === active.id);
      const newIndex = watch('policy_fields').findIndex((field) => field.id === over?.id);

      const newFields = arrayMove(watch('policy_fields'), oldIndex, newIndex);
      setValue('policy_fields', newFields);
    }
  };

  const watchName = watch('name');

  useEffect(() => {
    if (!service && !hasCustomServiceCode) {
      setValue('serviceCode', generateServiceCode(watchName || ''));
    }
  }, [watchName, hasCustomServiceCode, setValue, service]);

  const handleServiceCodeChange = (value: string) => {
    const sanitized = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3);
    setValue('serviceCode', sanitized, { shouldValidate: true, shouldDirty: true });
    setHasCustomServiceCode(true);
  };

  const handleServiceCodeBlur = (event: FocusEvent<HTMLInputElement>) => {
    serviceCodeRegister.onBlur(event);
    const trimmed = event.target.value.trim();
    if (!trimmed) {
      setHasCustomServiceCode(false);
      const regenerated = generateServiceCode(watchName || '');
      setValue('serviceCode', regenerated, { shouldValidate: true, shouldDirty: false });
    }
  };

  const handleServiceCodeFocus = () => {
    setHasCustomServiceCode(true);
  };

  // Field management handlers
  const handleFieldUpdate = (index: number, updatedField: ServicePolicyField) => {
    const fields = [...watch('policy_fields')];
    fields[index] = updatedField;
    setValue('policy_fields', fields);
  };

  const handleFieldRemove = (index: number) => {
    const fields = watch('policy_fields');
    const fieldToRemove = fields[index];
    setValue('policy_fields', fields.filter((_, i) => i !== index));
    setExpandedFields(prev => {
      const newSet = new Set(prev);
      newSet.delete(fieldToRemove.id);
      return newSet;
    });
  };

  const toggleFieldExpand = (fieldId: string) => {
    setExpandedFields(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fieldId)) {
        newSet.delete(fieldId);
      } else {
        newSet.add(fieldId);
      }
      return newSet;
    });
  };

  // Check if all required fields are completed
  const isFormComplete = () => {
    const formData = watch();
    return (
      formData.name &&
      formData.name.trim() !== '' &&
      formData.duration &&
      formData.duration > 0 &&
      formData.price !== undefined &&
      formData.price >= 0
    );
  };

  // Get disabled state for form inputs
  const getDisabledState = () => isViewMode;

  // Staff management functions
  const toggleStaff = (staffId: string) => {
    const current = watch('staff_ids');
    if (current.includes(staffId)) {
      setValue('staff_ids', current.filter(id => id !== staffId));
    } else {
      setValue('staff_ids', [...current, staffId]);
    }
  };

  const removeStaff = (staffId: string) => {
    setValue('staff_ids', watch('staff_ids').filter(id => id !== staffId));
  };

  // Get selected staff
  const selectedStaff = staff.filter(s => watch('staff_ids').includes(s.id));

  // Wizard Navigation
  const handleNext = async () => {
    let isValid = false;

    // Validate current step fields
    switch (activeTab) {
      case 'details':
        isValid = await trigger(['name', 'serviceCode', 'duration', 'category_id', 'instructions', 'description']);
        break;
      case 'pricing':
        isValid = await trigger(['price', 'sale_price']);
        break;
      case 'advanced':
        isValid = await trigger(['buffer_time', 'lead_time', 'scheduling_window', 'reschedule_cutoff', 'cancel_cutoff']);
        break;
      case 'policy':
        // Policy fields don't have strict form validation in the main schema
        isValid = true;
        break;
      default:
        isValid = true;
    }

    if (isValid) {
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1]);
      }
    }
  };

  const handleBack = () => {
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-7" style={{ borderRadius: '0.5rem' }}>
              <TabsTrigger value="details" style={{ borderRadius: '0.5rem' }} className="relative">
                {t('tabs.details')}
                {watch('name') && watch('duration') && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </TabsTrigger>
              <TabsTrigger value="pricing" style={{ borderRadius: '0.5rem' }} className="relative">
                {t('tabs.pricing')}
                {watch('price') !== undefined && watch('price') >= 0 && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </TabsTrigger>
              <TabsTrigger value="advanced" style={{ borderRadius: '0.5rem' }} className="relative">
                {t('tabs.advanced')}
                {watch('buffer_time') !== undefined && watch('lead_time') !== undefined && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </TabsTrigger>
              <TabsTrigger value="policy" style={{ borderRadius: '0.5rem' }} className="relative">
                {t('tabs.policy')}
                {watch('policy_fields') && watch('policy_fields').length > 0 && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </TabsTrigger>
              <TabsTrigger value="staff" style={{ borderRadius: '0.5rem' }} className="relative">
                {t('tabs.staff')}
                {watch('staff_ids') && watch('staff_ids').length > 0 && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </TabsTrigger>
              <TabsTrigger value="repeats" style={{ borderRadius: '0.5rem' }} className="relative">
                Herhalingen
              </TabsTrigger>
              <TabsTrigger value="addons" style={{ borderRadius: '0.5rem' }} className="relative">
                {t('tabs.addons')}
              </TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4 min-h-0 mt-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Service Name */}
                <div className="md:col-span-2 mb-4">
                  <Label htmlFor="name" className="text-sm font-medium mb-2">{t('name')}</Label>
                  <Input
                    id="name"
                    disabled={getDisabledState()}
                    {...register('name', { required: t('validation.nameRequired') })}
                    placeholder={t('placeholders.name')}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
                  )}
                </div>

                {/* Service Code */}
                <div className="md:col-span-2 mb-4">
                  <Label htmlFor="serviceCode" className="text-sm font-medium mb-2">{t('code')}</Label>
                  <Input
                    id="serviceCode"
                    name="serviceCode"
                    disabled={getDisabledState()}
                    value={watch('serviceCode')}
                    onChange={(e) => handleServiceCodeChange(e.target.value)}
                    onFocus={handleServiceCodeFocus}
                    onBlur={handleServiceCodeBlur}
                    ref={serviceCodeRegister.ref}
                    placeholder={t('placeholders.code')}
                    className={errors.serviceCode ? 'border-destructive' : ''}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('hints.codeHelp')}
                  </p>
                  {errors.serviceCode && (
                    <p className="text-sm text-destructive mt-1">{errors.serviceCode.message}</p>
                  )}
                </div>

                <div className="md:col-span-2 mb-4 space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="allows_twins" className="text-base">Allows Twins</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable twin pregnancy booking for this service (doubles duration/price)
                      </p>
                    </div>
                    <Switch
                      id="allows_twins"
                      checked={watch('allows_twins')}
                      onCheckedChange={(checked) => setValue('allows_twins', checked, { shouldDirty: true })}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="md:col-span-2 mb-4">
                  <Label htmlFor="description" className="text-sm font-medium mb-2">{t('description')}</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    placeholder={t('placeholders.description')}
                    rows={3}
                  />
                </div>

                {/* Duration */}
                <div className="mb-4">
                  <Label htmlFor="duration" className="text-sm font-medium mb-2">{t('duration')}</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    {...register('duration', {
                      required: t('validation.durationRequired'),
                      min: { value: 1, message: t('validation.durationMin') }
                    })}
                  />
                  {errors.duration && (
                    <p className="text-sm text-destructive mt-1">{errors.duration.message}</p>
                  )}
                </div>

                {/* Category */}
                <div className="mb-4">
                  <Label htmlFor="category" className="text-sm font-medium mb-2">{t('category')}</Label>
                  <div className="space-y-2">
                    <Select
                      key={watch('category_id')} // Force re-render when value changes
                      value={watch('category_id') || ''}
                      onValueChange={(value) => {
                        if (value === 'new') {
                          setShowNewCategoryInput(true);
                        } else {
                          setValue('category_id', value || null);
                          setShowNewCategoryInput(false);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('placeholders.category')} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="new">{t('labels.addCategory')}</SelectItem>
                      </SelectContent>
                    </Select>

                    {showNewCategoryInput && (
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder={t('placeholders.newCategory')}
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={async () => {
                            if (newCategoryName.trim()) {
                              try {
                                // Create category via API
                                const response = await fetch('/api/service-categories', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    name: newCategoryName.trim(),
                                    description: null,
                                  }),
                                });

                                if (response.ok) {
                                  const result = await response.json();
                                  const newCategory = result.data;

                                  // Add to local state
                                  setCategories(prev => [...prev, newCategory]);
                                  // Auto-select the new category with a small delay
                                  setTimeout(() => {
                                    setValue('category_id', newCategory.id);
                                  }, 100);
                                  setNewCategoryName('');
                                  setShowNewCategoryInput(false);
                                } else {
                                  console.error('Failed to create category');
                                }
                              } catch (error) {
                                console.error('Error creating category:', error);
                              }
                            }
                          }}
                        >
                          {t('labels.add')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowNewCategoryInput(false);
                            setNewCategoryName('');
                          }}
                        >
                          {tCommon('cancel')}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instructions */}
                <div className="md:col-span-2 mb-4">
                  <Label htmlFor="instructions" className="text-sm font-medium mb-2">{t('instructions')}</Label>
                  <Textarea
                    id="instructions"
                    {...register('instructions')}
                    placeholder={t('placeholders.instructions')}
                    rows={3}
                  />
                </div>

                {/* Active Status */}
                <div className="md:col-span-2 mb-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={watch('is_active')}
                      onCheckedChange={(checked) => {
                        setValue('is_active', checked);
                      }}
                    />
                    <Label htmlFor="is_active" className="text-sm font-medium mb-2">{t('labels.activeService')}</Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('hints.activeHelp')}
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing" className="space-y-4 min-h-0 mt-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Service Price */}
                <div className="mb-4">
                  <Label htmlFor="price" className="text-sm font-medium mb-2">{t('price')}</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('price', {
                      required: t('validation.priceRequired'),
                      min: { value: 0, message: t('validation.priceNegative') }
                    })}
                    placeholder="0.00"
                  />
                  {errors.price && (
                    <p className="text-sm text-destructive mt-1">{errors.price.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('hints.priceHelp')}
                  </p>
                </div>

                {/* Sale Price */}
                <div className="mb-4">
                  <Label htmlFor="sale_price" className="text-sm font-medium mb-2">{t('salePrice')}</Label>
                  <Input
                    id="sale_price"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('sale_price', {
                      min: { value: 0, message: t('validation.salePriceNegative') }
                    })}
                    placeholder="0.00"
                  />
                  {errors.sale_price && (
                    <p className="text-sm text-destructive mt-1">{errors.sale_price.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('hints.salePriceHelp')}
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4 min-h-0 mt-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Buffer Time */}
                <div className="mb-4">
                  <Label htmlFor="buffer_time" className="text-sm font-medium mb-2">{t('bufferTime')}</Label>
                  <Input
                    id="buffer_time"
                    type="number"
                    min="0"
                    {...register('buffer_time', {
                      min: { value: 0, message: 'Buffer time cannot be negative' }
                    })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('hints.bufferTimeHelp')}
                  </p>
                </div>

                {/* Lead Time */}
                <div className="mb-4">
                  <Label htmlFor="lead_time" className="text-sm font-medium mb-2">{t('leadTime')}</Label>
                  <Input
                    id="lead_time"
                    type="number"
                    min="0"
                    {...register('lead_time', {
                      min: { value: 0, message: 'Lead time cannot be negative' }
                    })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('hints.leadTimeHelp')}
                  </p>
                </div>

                {/* Scheduling Window */}
                <div className="mb-4">
                  <Label htmlFor="scheduling_window" className="text-sm font-medium mb-2">{t('schedulingWindow')}</Label>
                  <Input
                    id="scheduling_window"
                    type="number"
                    min="1"
                    {...register('scheduling_window', {
                      required: t('validation.schedulingWindowRequired'),
                      min: { value: 1, message: t('validation.schedulingWindowMin') }
                    })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('hints.schedulingWindowHelp')}
                  </p>
                </div>

                {/* Reschedule Cutoff Switch */}
                <div className="md:col-span-2 mb-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Switch
                      id="enable_reschedule_cutoff"
                      checked={watch('reschedule_cutoff') > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setValue('reschedule_cutoff', 24);
                        } else {
                          setValue('reschedule_cutoff', 0);
                        }
                      }}
                    />
                    <Label htmlFor="enable_reschedule_cutoff" className="text-sm font-medium mb-2">{t('labels.enableRescheduleCutoff')}</Label>
                  </div>

                  {watch('reschedule_cutoff') > 0 && (
                    <div className="mb-4">
                      <Label htmlFor="reschedule_cutoff" className="text-sm font-medium mb-2">{t('rescheduleCutoff')}</Label>
                      <Input
                        id="reschedule_cutoff"
                        type="number"
                        min="0"
                        {...register('reschedule_cutoff', {
                          min: { value: 0, message: t('validation.rescheduleCutoffNegative') }
                        })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('hints.rescheduleCutoffHelp')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Cancel Cutoff Switch */}
                <div className="md:col-span-2 mb-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Switch
                      id="enable_cancel_cutoff"
                      checked={watch('cancel_cutoff') !== null && watch('cancel_cutoff')! > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setValue('cancel_cutoff', 24);
                        } else {
                          setValue('cancel_cutoff', null);
                        }
                      }}
                    />
                    <Label htmlFor="enable_cancel_cutoff" className="text-sm font-medium mb-2">{t('labels.enableCancelCutoff')}</Label>
                  </div>

                  {watch('cancel_cutoff') !== null && watch('cancel_cutoff')! > 0 && (
                    <div className="mb-4">
                      <Label htmlFor="cancel_cutoff" className="text-sm font-medium mb-2">{t('cancelCutoff')}</Label>
                      <Input
                        id="cancel_cutoff"
                        type="number"
                        min="0"
                        {...register('cancel_cutoff', {
                          min: { value: 0, message: t('validation.cancelCutoffNegative') }
                        })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('hints.cancelCutoffHelp')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Policy Tab */}
            <TabsContent value="policy" className="space-y-4 min-h-0 mt-12">
              <div className="space-y-6">
                {/* Add New Field */}
                <div className="border rounded-lg p-4 bg-muted/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">{t('labels.addPolicyField')}</h3>
                    <div className="text-sm text-muted-foreground">
                      {watch('policy_fields').length} field{watch('policy_fields').length !== 1 ? 's' : ''} added
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="field_type" className="text-sm font-medium mb-2">{t('labels.fieldType')}</Label>
                      <Select
                        value=""
                        onValueChange={(value: string) => {
                          const newField: ServicePolicyField = {
                            id: `temp_${Date.now()}`,
                            service_id: service?.id || '',
                            field_type: value as ServicePolicyField['field_type'],
                            title: '',
                            description: null,
                            is_required: false,
                            order: watch('policy_fields').length,
                            choices: value === 'multi_choice' ? [] : undefined,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                          };
                          setValue('policy_fields', [...watch('policy_fields'), newField]);
                        }}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('placeholders.fieldType')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="multi_choice">Multi Choice</SelectItem>
                          <SelectItem value="text_input">Text Input</SelectItem>
                          <SelectItem value="number_input">Number Input</SelectItem>
                          <SelectItem value="date_time">Date/Time</SelectItem>
                          <SelectItem value="checkbox">Checkbox</SelectItem>
                          <SelectItem value="file_upload">File Upload</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('hints.fieldTypeHelp')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Policy Fields List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">{t('labels.policyFields')}</h3>
                    {watch('policy_fields').length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        {t('hints.dragReorder')}
                      </div>
                    )}
                  </div>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={watch('policy_fields').map(field => field.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {watch('policy_fields').map((field, index) => (
                          <SortableField
                            key={field.id}
                            field={field}
                            index={index}
                            isExpanded={expandedFields.has(field.id)}
                            onToggleExpand={() => toggleFieldExpand(field.id)}
                            onUpdate={(updatedField) => handleFieldUpdate(index, updatedField)}
                            onRemove={() => handleFieldRemove(index)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {watch('policy_fields').length === 0 && (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                      <div className="space-y-2">
                        <p className="text-lg font-medium">{t('hints.noPolicyFields')}</p>
                        <p className="text-sm">{t('hints.noPolicyFieldsHelp')}</p>
                        <p className="text-xs">{t('hints.noPolicyFieldsHelp2')}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Staff Tab */}
            <TabsContent value="staff" className="space-y-4 min-h-0 mt-12">
              <div className="space-y-6">
                {/* Staff Assignment Section */}
                <div className="border rounded-lg p-4 bg-muted/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">{t('labels.assignStaff')}</h3>
                    <div className="text-sm text-muted-foreground">
                      {watch('staff_ids').length} staff member{watch('staff_ids').length !== 1 ? 's' : ''} assigned
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2">{t('labels.selectStaff')}</Label>
                      <Popover open={staffDropdownOpen} onOpenChange={setStaffDropdownOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={staffDropdownOpen}
                            className="w-full justify-between mt-1 bg-card border border-border active:bg-card hover:bg-card"
                            style={{ borderRadius: '0.2rem' }}
                            disabled={getDisabledState()}
                          >
                            <span className="text-muted-foreground">
                              {selectedStaff.length === 0
                                ? t('placeholders.selectStaff')
                                : `${selectedStaff.length} staff member${selectedStaff.length !== 1 ? 's' : ''} selected`}
                            </span>
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                          <Command>
                            <CommandInput placeholder={t('placeholders.searchStaff')} />
                            <CommandList>
                              <CommandEmpty>{t('hints.noStaffFound')}</CommandEmpty>
                              <CommandGroup>
                                {staff.map((staffMember) => (
                                  <CommandItem
                                    key={staffMember.id}
                                    value={`${staffMember.first_name} ${staffMember.last_name}`}
                                    onSelect={() => toggleStaff(staffMember.id)}
                                  >
                                    <div className="flex items-center gap-2 flex-1">
                                      <input
                                        type="checkbox"
                                        checked={watch('staff_ids').includes(staffMember.id)}
                                        onChange={() => { }}
                                        className="rounded"
                                        aria-label={`Select ${staffMember.first_name} ${staffMember.last_name}`}
                                      />
                                      <div className="flex flex-col">
                                        <span className="text-sm font-medium">
                                          {staffMember.first_name} {staffMember.last_name}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {staffMember.email}
                                        </span>
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('hints.selectStaffHelp')}
                      </p>
                    </div>

                    {/* Selected Staff as Badges */}
                    {selectedStaff.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium mb-2">{t('labels.assignedStaff')}</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedStaff.map((staffMember) => (
                            <Badge key={staffMember.id} variant="secondary" className="gap-1 py-2 px-3">
                              <span>{staffMember.first_name} {staffMember.last_name}</span>
                              <span className="text-xs text-muted-foreground">({staffMember.role})</span>
                              {!getDisabledState() && (
                                <button
                                  type="button"
                                  onClick={() => removeStaff(staffMember.id)}
                                  className="ml-1 rounded-full hover:bg-muted-foreground/20"
                                  aria-label={`Remove ${staffMember.first_name} ${staffMember.last_name}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Empty State */}
                {watch('staff_ids').length === 0 && (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                    <div className="space-y-2">
                      <p className="text-lg font-medium">{t('hints.noStaffAssigned')}</p>
                      <p className="text-sm">{t('hints.noStaffAssignedHelp')}</p>
                      <p className="text-xs">{t('hints.noStaffAssignedHelp2')}</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Repeats Tab */}
            <TabsContent value="repeats" className="mt-12">
              <ServiceRepeatManager serviceId={service?.id} />
            </TabsContent>

            {/* Add-ons Tab */}
            <TabsContent value="addons" className="space-y-4 min-h-0 mt-12">
              <AddonsManager serviceId={service?.id} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Form Actions - Fixed at Bottom */}
        {
          !isViewMode && (
            <div className="py-4 border-t bg-background mt-auto">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-muted-foreground">
                      {/* Step Indicator */}
                      <span className="font-medium text-foreground">
                        Step {tabs.indexOf(activeTab) + 1} of {tabs.length}
                      </span>
                      <span className="mx-2 text-muted-foreground/30">|</span>
                      {t(`tabs.${activeTab}`)}
                    </div>
                    {!service && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground ml-4">
                        <div className="flex gap-1">
                          {tabs.map((tab) => {
                            const isCompleted = tabs.indexOf(tab) < tabs.indexOf(activeTab);
                            const isCurrent = tab === activeTab;
                            return (
                              <div
                                key={tab}
                                className={`w-2 h-2 rounded-full transition-colors ${isCurrent ? 'bg-primary' : isCompleted ? 'bg-primary/50' : 'bg-muted'
                                  }`}
                                title={t(`tabs.${tab}`)}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={onCancel}
                      className="mr-2"
                    >
                      {tCommon('cancel')}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      disabled={isFirstStep}
                      className={isFirstStep ? 'opacity-0 pointer-events-none' : ''}
                    >
                      Back
                    </Button>

                    {isLastStep ? (
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="min-w-[120px]"
                      >
                        {isSubmitting ? tCommon('saving') : service ? t('buttons.update') : t('buttons.create')}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          handleNext();
                        }}
                        className="min-w-[100px]"
                      >
                        Next
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {/* View Mode Actions - Fixed at Bottom */}
        {
          isViewMode && (
            <div className="py-4 border-t bg-background mt-auto flex justify-end">
              <Button type="button" variant="outline" onClick={onCancel}>
                {tCommon('close')}
              </Button>
            </div>
          )
        }
      </form >
    </div >
  );
}
