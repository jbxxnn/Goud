'use client';

import { useState, useEffect } from 'react';
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
import { GripVertical, ChevronDown, ChevronRight } from 'lucide-react';

interface ServiceFormProps {
  service?: Service;
  onSave: (service: ServiceFormData) => void;
  onCancel: () => void;
  isViewMode?: boolean;
}

interface ServiceFormData {
  name: string;
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
  is_active: boolean;
}

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
            Remove
          </Button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            {/* Field Title */}
            <div>
              <Label htmlFor={`field_title_${index}`}>Field Title *</Label>
              <Input
                id={`field_title_${index}`}
                value={field.title}
                onChange={(e) => onUpdate({ ...field, title: e.target.value })}
                placeholder="e.g., Gender Reveal Options"
              />
            </div>

            {/* Field Description */}
            <div>
              <Label htmlFor={`field_description_${index}`}>Description</Label>
              <Input
                id={`field_description_${index}`}
                value={field.description || ''}
                onChange={(e) => onUpdate({ ...field, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>

            {/* Required Switch */}
            <div className="flex items-center space-x-2">
              <Switch
                id={`field_required_${index}`}
                checked={field.is_required}
                onCheckedChange={(checked) => onUpdate({ ...field, is_required: checked })}
              />
              <Label htmlFor={`field_required_${index}`}>Required Field</Label>
            </div>

            {/* Multi Choice Options */}
            {field.field_type === 'multi_choice' && (
              <div className="md:col-span-2">
                <Label>Choices</Label>
                <div className="space-y-2 mt-2">
                  {field.choices?.map((choice, choiceIndex) => (
                    <div key={choice.id} className="flex items-center gap-2">
                      <Input
                        placeholder="Choice title"
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
                        Remove
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
                    Add Choice
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

export default function ServiceForm({ service, onSave, onCancel, isViewMode = false }: ServiceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);
  
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
    setValue
  } = useForm<ServiceFormData>({
    defaultValues: {
      name: '',
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
      is_active: true,
    },
  });

  // Reset form when service changes
  useEffect(() => {
    if (service) {
      reset({
        name: service.name,
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
        is_active: service.is_active,
      });
    } else {
      reset({
        name: '',
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
        is_active: true,
      });
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
      await onSave(data);
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 min-h-0">
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-5" style={{ borderRadius: '0.5rem' }}>
          <TabsTrigger value="details" style={{ borderRadius: '0.5rem' }} className="relative">
            Details
            {watch('name') && watch('duration') && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
            )}
          </TabsTrigger>
            <TabsTrigger value="pricing" style={{ borderRadius: '0.5rem' }} className="relative">
              Pricing
              {watch('price') !== undefined && watch('price') >= 0 && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
              )}
            </TabsTrigger>
          <TabsTrigger value="advanced" style={{ borderRadius: '0.5rem' }} className="relative">
            Advanced
            {watch('buffer_time') !== undefined && watch('lead_time') !== undefined && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger value="policy" style={{ borderRadius: '0.5rem' }} className="relative">
            Policy
            {watch('policy_fields') && watch('policy_fields').length > 0 && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger value="staff" style={{ borderRadius: '0.5rem' }} className="relative">
            Staff
            {watch('staff_ids') && watch('staff_ids').length > 0 && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
            )}
          </TabsTrigger>
        </TabsList>
        
        {/* Details Tab */}
      <TabsContent value="details" className="space-y-4 min-h-0 mt-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Service Name */}
        <div className="md:col-span-2">
          <Label htmlFor="name">Service Name *</Label>
          <Input
            id="name"
            disabled={getDisabledState()}
            {...register('name', { required: 'Service name is required' })}
            placeholder="e.g., 12-Week Ultrasound"
          />
          {errors.name && (
            <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Brief description of the service"
            rows={3}
          />
        </div>

            {/* Duration */}
            <div>
              <Label htmlFor="duration">Duration (minutes) *</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                {...register('duration', { 
                  required: 'Duration is required',
                  min: { value: 1, message: 'Duration must be at least 1 minute' }
                })}
              />
              {errors.duration && (
                <p className="text-sm text-destructive mt-1">{errors.duration.message}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">Category</Label>
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
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="new">+ Add New Category</SelectItem>
                  </SelectContent>
                </Select>
                
                {showNewCategoryInput && (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="New category name"
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
                      Add
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
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="md:col-span-2">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                {...register('instructions')}
                placeholder="Special instructions for this service"
                rows={3}
              />
            </div>

            {/* Active Status */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={watch('is_active')}
                  onCheckedChange={(checked) => {
                    setValue('is_active', checked);
                  }}
                />
                <Label htmlFor="is_active">Active Service</Label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Only active services are available for booking
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing" className="space-y-4 min-h-0 mt-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Service Price */}
            <div>
              <Label htmlFor="price">Service Price ($) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                {...register('price', { 
                  required: 'Service price is required',
                  min: { value: 0, message: 'Price cannot be negative' }
                })}
                placeholder="0.00"
              />
              {errors.price && (
                <p className="text-sm text-destructive mt-1">{errors.price.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Base price for this service
              </p>
            </div>

            {/* Sale Price */}
            <div>
              <Label htmlFor="sale_price">Sale Price ($)</Label>
              <Input
                id="sale_price"
                type="number"
                step="0.01"
                min="0"
                {...register('sale_price', { 
                  min: { value: 0, message: 'Sale price cannot be negative' }
                })}
                placeholder="0.00"
              />
              {errors.sale_price && (
                <p className="text-sm text-destructive mt-1">{errors.sale_price.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Optional discounted price
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-4 min-h-0 mt-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Buffer Time */}
        <div>
          <Label htmlFor="buffer_time">Buffer Time (minutes)</Label>
          <Input
            id="buffer_time"
            type="number"
            min="0"
            {...register('buffer_time', { 
              min: { value: 0, message: 'Buffer time cannot be negative' }
            })}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Extra time between appointments
          </p>
        </div>

        {/* Lead Time */}
        <div>
          <Label htmlFor="lead_time">Lead Time (hours)</Label>
          <Input
            id="lead_time"
            type="number"
            min="0"
            {...register('lead_time', { 
              min: { value: 0, message: 'Lead time cannot be negative' }
            })}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Minimum advance booking time
          </p>
        </div>

            {/* Scheduling Window */}
            <div>
              <Label htmlFor="scheduling_window">Scheduling Window (weeks)</Label>
              <Input
                id="scheduling_window"
                type="number"
                min="1"
                {...register('scheduling_window', { 
                  required: 'Scheduling window is required',
                  min: { value: 1, message: 'Scheduling window must be at least 1 week' }
                })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                How many weeks in advance can be booked
              </p>
            </div>

            {/* Reschedule Cutoff Switch */}
            <div className="md:col-span-2">
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
                <Label htmlFor="enable_reschedule_cutoff">Enable Reschedule Cutoff</Label>
              </div>
              
              {watch('reschedule_cutoff') > 0 && (
        <div>
          <Label htmlFor="reschedule_cutoff">Reschedule Cutoff (hours)</Label>
          <Input
            id="reschedule_cutoff"
            type="number"
            min="0"
            {...register('reschedule_cutoff', { 
              min: { value: 0, message: 'Reschedule cutoff cannot be negative' }
            })}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Hours before appointment when rescheduling is no longer allowed
          </p>
                </div>
              )}
        </div>

            {/* Cancel Cutoff Switch */}
        <div className="md:col-span-2">
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
                <Label htmlFor="enable_cancel_cutoff">Enable Cancel Cutoff</Label>
              </div>
              
              {watch('cancel_cutoff') !== null && watch('cancel_cutoff')! > 0 && (
                <div>
                  <Label htmlFor="cancel_cutoff">Cancel Cutoff (hours)</Label>
                  <Input
                    id="cancel_cutoff"
                    type="number"
                    min="0"
                    {...register('cancel_cutoff', { 
                      min: { value: 0, message: 'Cancel cutoff cannot be negative' }
                    })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Hours before appointment when cancellation is no longer allowed
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
                <h3 className="text-lg font-medium">Add Policy Field</h3>
                <div className="text-sm text-muted-foreground">
                  {watch('policy_fields').length} field{watch('policy_fields').length !== 1 ? 's' : ''} added
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="field_type">Field Type</Label>
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
                      <SelectValue placeholder="Select field type to add" />
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
                    Select a field type to add it to the form
                  </p>
                </div>
              </div>
            </div>

            {/* Policy Fields List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Policy Fields</h3>
                {watch('policy_fields').length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Drag to reorder • Click to expand/collapse
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
                    <p className="text-lg font-medium">No policy fields added yet</p>
                    <p className="text-sm">Add custom fields that patients will fill out when booking this service</p>
                    <p className="text-xs">Select a field type above to get started</p>
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
                <h3 className="text-lg font-medium">Assign Staff to Service</h3>
                <div className="text-sm text-muted-foreground">
                  {watch('staff_ids').length} staff member{watch('staff_ids').length !== 1 ? 's' : ''} assigned
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Select Staff Members</Label>
                  <Popover open={staffDropdownOpen} onOpenChange={setStaffDropdownOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={staffDropdownOpen}
                        className="w-full justify-between mt-1 bg-transparent h-12 border-2 border-primary-foreground"
                        disabled={getDisabledState()}
                      >
                        <span className="text-muted-foreground">
                          {selectedStaff.length === 0
                            ? 'Select staff members...'
                            : `${selectedStaff.length} staff member${selectedStaff.length !== 1 ? 's' : ''} selected`}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                      <Command>
                        <CommandInput placeholder="Search staff..." />
                        <CommandList>
                          <CommandEmpty>No staff found.</CommandEmpty>
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
                                    onChange={() => {}}
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
                    Select staff members who are qualified to perform this service
                  </p>
                </div>

                {/* Selected Staff as Badges */}
                {selectedStaff.length > 0 && (
                  <div>
                    <Label>Assigned Staff</Label>
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
                  <p className="text-lg font-medium">No staff assigned yet</p>
                  <p className="text-sm">Assign staff members who are qualified to perform this service</p>
                  <p className="text-xs">Use the dropdown above to select staff members</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Form Actions */}
      {!isViewMode && (
        <div className="flex flex-col justify-between items-start pt-4 border-t gap-8">
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              {service 
                ? 'Update your service details' 
                : isFormComplete() 
                  ? 'Ready to create service' 
                  : 'Complete required fields: Name, Duration, and Price'
              }
            </div>
            {!service && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>Progress:</span>
                <div className="flex gap-1">
                  {[
                    { key: 'details', condition: watch('name') && watch('duration') },
                    { key: 'pricing', condition: watch('price') !== undefined && watch('price') >= 0 },
                    { key: 'advanced', condition: watch('buffer_time') !== undefined && watch('lead_time') !== undefined },
                    { key: 'policy', condition: watch('policy_fields') && watch('policy_fields').length > 0 }
                  ].map((tab) => (
                    <div
                      key={tab.key}
                      className={`w-2 h-2 rounded-full ${tab.condition ? 'bg-primary' : 'bg-gray-300'}`}
                      title={`${tab.key} ${tab.condition ? 'completed' : 'pending'}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || (!service && !isFormComplete())} 
              className="min-w-[120px]"
            >
              {isSubmitting ? 'Saving...' : service ? 'Update Service' : 'Create Service'}
            </Button>
          </div>
        </div>
      )}
      
      {/* View Mode Actions */}
      {isViewMode && (
        <div className="flex justify-end pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Close
          </Button>
        </div>
      )}
    </form>
  );
}
