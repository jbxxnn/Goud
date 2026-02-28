"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, UsersResponse } from "@/lib/types/user";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, UserAdd01Icon, UserIcon, Calendar01Icon } from "@hugeicons/core-free-icons";
import { format } from "date-fns";
import { toast } from "sonner";
import { Midwife, MidwivesResponse } from "@/lib/types/midwife";
import { useTranslations } from "next-intl";

interface ClientSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (client: User) => void;
}

export function ClientSelectionModal({ isOpen, onClose, onSelect }: ClientSelectionModalProps) {
  const t = useTranslations("BookingDialog.clientModal");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newClient, setNewClient] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    postal_code: "",
    house_number: "",
    street_name: "",
    city: "",
    birth_date: "",
    midwife_id: "",
  });
  const [birthDateOpen, setBirthDateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading, refetch } = useQuery<UsersResponse>({
    queryKey: ["clients", searchTerm],
    queryFn: async () => {
      const res = await fetch(`/api/users?role=client&search=${encodeURIComponent(searchTerm)}&limit=20`);
      if (!res.ok) throw new Error(t("toasts.fetchClientsError"));
      return res.json();
    },
    enabled: isOpen && !isCreating,
  });

  const { data: midwivesData } = useQuery<MidwivesResponse>({
    queryKey: ["midwives", "active"],
    queryFn: async () => {
      const res = await fetch("/api/midwives?active_only=true");
      if (!res.ok) throw new Error(t("toasts.fetchMidwivesError"));
      return res.json();
    },
    enabled: isOpen && isCreating,
  });

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/users/admin-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newClient, role: "client" }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || t("toasts.error"));

      toast.success(t("toasts.success"));
      setIsCreating(false);
      onSelect(result.data);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toasts.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-w-2xl max-h-[90vh] h-full flex flex-col p-0 overflow-hidden" style={{borderRadius: '0.5rem'}}>
        <DialogHeader className="p-6 pb-2 border-b bg-card">
          <DialogTitle className="flex justify-between items-center text-xl">
            {isCreating ? t("createTitle") : t("title")}
            {/* {!isCreating && (
              <Button size="sm" onClick={() => setIsCreating(true)} className="gap-2" style={{ borderRadius: '0.5rem' }}>
                <HugeiconsIcon icon={UserAdd01Icon} size={18} />
                New Client
              </Button>
            )} */}
          </DialogTitle>
        </DialogHeader>

        {!isCreating && (
          <div className="flex items-center justify-between p-6 py-2 border-b bg-muted/5">
            <div className="relative">
              <HugeiconsIcon 
                icon={Search01Icon} 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" 
                size={18} 
              />
              <Input
                placeholder={t("searchPlaceholder")}
                className="pl-10 h-10 bg-card"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ borderRadius: '1rem' }}
              />
            </div>
            {!isCreating && (
              <Button size="sm" onClick={() => setIsCreating(true)} className="gap-2" style={{ borderRadius: '1rem' }}>
                <HugeiconsIcon icon={UserAdd01Icon} size={18} />
                {t("newClient")}
              </Button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 py-4">
            {isCreating ? (
              <form id="create-client-form" onSubmit={handleCreateClient} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium uppercase text-muted-foreground/70 tracking-wider">{t("form.firstName")}</Label>
                    <Input 
                      required 
                      value={newClient.first_name} 
                      onChange={(e) => setNewClient({...newClient, first_name: e.target.value})}
                      placeholder={t("form.placeholders.firstName")}
                      className="bg-card h-10"
                      style={{ borderRadius: '1rem' }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium uppercase text-muted-foreground/70 tracking-wider">{t("form.lastName")}</Label>
                    <Input 
                      required 
                      value={newClient.last_name} 
                      onChange={(e) => setNewClient({...newClient, last_name: e.target.value})}
                      placeholder={t("form.placeholders.lastName")}
                      className="bg-card h-10"
                      style={{ borderRadius: '1rem' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium uppercase text-muted-foreground/70 tracking-wider">{t("form.email")}</Label>
                    <Input 
                      required 
                      type="email" 
                      value={newClient.email} 
                      onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                      placeholder={t("form.placeholders.email")}
                      className="bg-card h-10"
                      style={{ borderRadius: '1rem' }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium uppercase text-muted-foreground/70 tracking-wider">{t("form.phone")}</Label>
                    <Input 
                      value={newClient.phone} 
                      onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                      placeholder={t("form.placeholders.phone")}
                      className="bg-card h-10"
                      style={{ borderRadius: '1rem' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium uppercase text-muted-foreground/70 tracking-wider">{t("form.dob")}</Label>
                    <Popover modal={true} open={birthDateOpen} onOpenChange={setBirthDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal h-10 px-3 border-input bg-card ring-0 outline-none focus:ring-0 focus:outline-none",
                            !newClient.birth_date && "text-muted-foreground"
                          )}
                          style={{ borderRadius: '1rem' }}
                        >
                          <HugeiconsIcon icon={Calendar01Icon} size={18} className="mr-2 h-4 w-4" />
                          {newClient.birth_date ? format(new Date(newClient.birth_date), "dd/MM/yyyy") : <span>{t("form.placeholders.dob")}</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          captionLayout="dropdown"
                          fromYear={1900}
                          toYear={new Date().getFullYear()}
                          selected={newClient.birth_date ? new Date(newClient.birth_date) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setNewClient({ ...newClient, birth_date: date.toISOString() });
                              setBirthDateOpen(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium uppercase text-muted-foreground/70 tracking-wider">{t("form.midwife")}</Label>
                    <Select 
                      value={newClient.midwife_id} 
                      onValueChange={(val) => setNewClient({...newClient, midwife_id: val})}
                    >
                      <SelectTrigger className="h-10 rounded-md bg-card px-3 py-2" style={{borderRadius: "0.5rem"}}>
                        <SelectValue placeholder={t("form.placeholders.midwife")} />
                      </SelectTrigger>
                      <SelectContent>
                        {midwivesData?.data?.map((mw: Midwife) => (
                          <SelectItem key={mw.id} value={mw.id}>
                            {mw.first_name} {mw.last_name} {mw.practice_name ? `(${mw.practice_name})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4 border rounded-md p-4 bg-muted/5" style={{ borderRadius: '0.5rem' }}>
                  <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">{t("form.addressInfo")}</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">{t("form.postalCode")}</Label>
                      <Input 
                        value={newClient.postal_code} 
                        onChange={(e) => setNewClient({...newClient, postal_code: e.target.value})}
                        placeholder={t("form.placeholders.postalCode")}
                        className="bg-card h-10"
                        style={{ borderRadius: '1rem' }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">{t("form.houseNumber")}</Label>
                      <Input 
                        value={newClient.house_number} 
                        onChange={(e) => setNewClient({...newClient, house_number: e.target.value})}
                        placeholder={t("form.placeholders.houseNumber")}
                        className="bg-card h-10"
                        style={{ borderRadius: '1rem' }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">{t("form.city")}</Label>
                      <Input 
                        value={newClient.city} 
                        onChange={(e) => setNewClient({...newClient, city: e.target.value})}
                        placeholder={t("form.placeholders.city")}
                        className="bg-card h-10"
                        style={{ borderRadius: '1rem' }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">{t("form.street")}</Label>
                    <Input 
                      value={newClient.street_name} 
                      onChange={(e) => setNewClient({...newClient, street_name: e.target.value})}
                      placeholder={t("form.placeholders.street")}
                      className="bg-card h-10"
                      style={{ borderRadius: '1rem' }}
                    />
                  </div>
                </div>
              </form>
            ) : !searchTerm.trim() ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-muted/5 border-2 border-dashed rounded-lg" style={{ borderRadius: '0.5rem' }}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={Search01Icon} size={15} className="text-muted-foreground" />
                    <h3 className="font-semibold text-base">{t("findClient")}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground max-w-[250px]">
                    {t("findClientDesc")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden" style={{ borderRadius: '0.5rem' }}>
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="bg-card">{t("table.name")}</TableHead>
                      <TableHead className="bg-card">{t("table.email")}</TableHead>
                      <TableHead className="bg-card">{t("table.dob")}</TableHead>
                      <TableHead className="text-right bg-card">{t("table.action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">{t("loading")}</TableCell>
                      </TableRow>
                    ) : data?.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">{t("noClients")}</TableCell>
                      </TableRow>
                    ) : (
                      data?.data?.map((client) => (
                        <TableRow key={client.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(client)}>
                          <TableCell className="font-medium flex items-center gap-2">
                            <HugeiconsIcon icon={UserIcon} size={16} className="text-muted-foreground border rounded-full p-0.5" />
                            <span className="capitalize">{client.first_name} {client.last_name}</span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{client.email}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {client.birth_date ? format(new Date(client.birth_date), "dd/MM/yyyy") : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="font-medium bg-accent p-2 hover:text-primary transition-colors" style={{ borderRadius: '1rem' }}>{t("select")}</Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        {isCreating && (
          <DialogFooter className="p-6 py-4 border-t bg-card">
            <Button type="button" variant="outline" onClick={() => setIsCreating(false)} style={{ borderRadius: '0.5rem' }}>{t("cancel")}</Button>
            <Button type="submit" form="create-client-form" disabled={isSubmitting} style={{ borderRadius: '0.5rem' }}>
              {isSubmitting ? t("creating") : t("createAndSelect")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
