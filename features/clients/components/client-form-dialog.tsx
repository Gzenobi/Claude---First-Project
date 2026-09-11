"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { INDUSTRY_SEGMENTS } from "@/lib/constants";
import type { Client } from "@/types";

import { createClientAction, updateClientAction } from "../actions";
import { clientSchema, type ClientInput } from "../schema";

const emptyValues: ClientInput = {
  name: "",
  industrySegment: "",
  plantName: "",
  city: "",
  country: "",
  contactName: "",
  contactPosition: "",
  contactPhone: "",
  contactEmail: "",
  currentCompetitor: "",
  annualPotentialUsd: 0,
  notes: "",
};

export function ClientFormDialog({ client }: { client?: Client }) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(client);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (open) {
      reset(
        client
          ? {
              name: client.name,
              industrySegment: client.industrySegment,
              plantName: client.plantName ?? "",
              city: client.city ?? "",
              country: client.country ?? "",
              contactName: client.contactName ?? "",
              contactPosition: client.contactPosition ?? "",
              contactPhone: client.contactPhone ?? "",
              contactEmail: client.contactEmail ?? "",
              currentCompetitor: client.currentCompetitor ?? "",
              annualPotentialUsd: client.annualPotentialUsd,
              notes: client.notes ?? "",
            }
          : emptyValues,
      );
    }
  }, [open, client, reset]);

  async function onSubmit(values: ClientInput) {
    const result = isEdit && client
      ? await updateClientAction(client.id, values)
      : await createClientAction(values);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(isEdit ? "Cliente actualizado" : "Cliente creado");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="sm">
            Editar
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Nuevo cliente
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Nombre del cliente</Label>
            <Input id="name" {...register("name")} placeholder="Ej: YPF Refinería La Plata" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Segmento industrial</Label>
            <Select
              value={watch("industrySegment")}
              onValueChange={(value) => setValue("industrySegment", value, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar segmento" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRY_SEGMENTS.map((segment) => (
                  <SelectItem key={segment} value={segment}>
                    {segment}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.industrySegment && (
              <p className="text-xs text-destructive">{errors.industrySegment.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="plantName">Planta</Label>
            <Input id="plantName" {...register("plantName")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="city">Ciudad</Label>
            <Input id="city" {...register("city")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="country">País</Label>
            <Input id="country" {...register("country")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contactName">Contacto principal</Label>
            <Input id="contactName" {...register("contactName")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contactPosition">Cargo</Label>
            <Input id="contactPosition" {...register("contactPosition")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contactPhone">Teléfono</Label>
            <Input id="contactPhone" {...register("contactPhone")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contactEmail">Email de contacto</Label>
            <Input id="contactEmail" type="email" {...register("contactEmail")} />
            {errors.contactEmail && (
              <p className="text-xs text-destructive">{errors.contactEmail.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="currentCompetitor">Competidor actual</Label>
            <Input id="currentCompetitor" {...register("currentCompetitor")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="annualPotentialUsd">Potencial anual (USD)</Label>
            <Input
              id="annualPotentialUsd"
              type="number"
              min={0}
              step="1000"
              {...register("annualPotentialUsd")}
            />
            {errors.annualPotentialUsd && (
              <p className="text-xs text-destructive">{errors.annualPotentialUsd.message}</p>
            )}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">Observaciones</Label>
            <Textarea id="notes" rows={3} {...register("notes")} />
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
