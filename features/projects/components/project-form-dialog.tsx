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
import { COATING_TYPES, CURRENCIES, INDUSTRY_SEGMENTS, PROJECT_STATUSES } from "@/lib/constants";
import type { ProjectWithClient } from "@/types";

import { createProjectAction, updateProjectAction } from "../actions";
import { projectSchema, type ProjectInput } from "../schema";

const emptyValues: ProjectInput = {
  clientId: "",
  name: "",
  industrySegment: "",
  coatingType: "",
  status: "prospecto",
  estimatedValue: 0,
  currency: "USD",
  winProbability: 10,
  estimatedCloseDate: "",
  competitor: "",
  technicalNotes: "",
};

interface ProjectFormDialogProps {
  project?: ProjectWithClient;
  clientOptions: { id: string; name: string }[];
  trigger?: React.ReactNode;
}

export function ProjectFormDialog({ project, clientOptions, trigger }: ProjectFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(project);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (open) {
      reset(
        project
          ? {
              clientId: project.clientId,
              name: project.name,
              industrySegment: project.industrySegment,
              coatingType: project.coatingType,
              status: project.status,
              estimatedValue: project.estimatedValue,
              currency: project.currency,
              winProbability: project.winProbability,
              estimatedCloseDate: project.estimatedCloseDate ?? "",
              competitor: project.competitor ?? "",
              technicalNotes: project.technicalNotes ?? "",
            }
          : emptyValues,
      );
    }
  }, [open, project, reset]);

  async function onSubmit(values: ProjectInput) {
    const result = isEdit && project
      ? await updateProjectAction(project.id, values)
      : await createProjectAction(values);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(isEdit ? "Proyecto actualizado" : "Proyecto creado");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" />
            Nuevo proyecto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar proyecto" : "Nuevo proyecto"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Nombre del proyecto</Label>
            <Input id="name" {...register("name")} placeholder="Ej: Recubrimiento de tanques" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <Select value={watch("clientId")} onValueChange={(v) => setValue("clientId", v, { shouldValidate: true })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clientId && <p className="text-xs text-destructive">{errors.clientId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Segmento industrial</Label>
            <Select
              value={watch("industrySegment")}
              onValueChange={(v) => setValue("industrySegment", v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar segmento" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRY_SEGMENTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de recubrimiento</Label>
            <Select
              value={watch("coatingType")}
              onValueChange={(v) => setValue("coatingType", v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {COATING_TYPES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select
              value={watch("status")}
              onValueChange={(v) => setValue("status", v as ProjectInput["status"], { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="estimatedValue">Valor estimado</Label>
            <div className="flex gap-2">
              <Input
                id="estimatedValue"
                type="number"
                min={0}
                step="1000"
                {...register("estimatedValue")}
              />
              <Select value={watch("currency")} onValueChange={(v) => setValue("currency", v)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="winProbability">Probabilidad de cierre (%)</Label>
            <Input
              id="winProbability"
              type="number"
              min={0}
              max={100}
              {...register("winProbability")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="estimatedCloseDate">Fecha estimada de cierre</Label>
            <Input id="estimatedCloseDate" type="date" {...register("estimatedCloseDate")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="competitor">Competidor</Label>
            <Input id="competitor" {...register("competitor")} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="technicalNotes">Observaciones técnicas</Label>
            <Textarea id="technicalNotes" rows={3} {...register("technicalNotes")} />
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Crear proyecto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
