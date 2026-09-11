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
import { ACTIVITY_TYPES } from "@/lib/constants";
import type { ActivityWithRelations } from "@/types";

import { createActivityAction, updateActivityAction } from "../actions";
import { activitySchema, type ActivityInput } from "../schema";

const emptyValues: ActivityInput = {
  clientId: "",
  projectId: "",
  activityType: "visita",
  activityDate: new Date().toISOString().slice(0, 10),
  result: "",
  nextAction: "",
  nextActionDate: "",
  comments: "",
};

interface ActivityFormDialogProps {
  activity?: ActivityWithRelations;
  clientOptions: { id: string; name: string }[];
  projectOptions: { id: string; name: string }[];
  trigger?: React.ReactNode;
}

export function ActivityFormDialog({
  activity,
  clientOptions,
  projectOptions,
  trigger,
}: ActivityFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(activity);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ActivityInput>({
    resolver: zodResolver(activitySchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (open) {
      reset(
        activity
          ? {
              clientId: activity.clientId ?? "",
              projectId: activity.projectId ?? "",
              activityType: activity.activityType,
              activityDate: activity.activityDate,
              result: activity.result ?? "",
              nextAction: activity.nextAction ?? "",
              nextActionDate: activity.nextActionDate ?? "",
              comments: activity.comments ?? "",
            }
          : emptyValues,
      );
    }
  }, [open, activity, reset]);

  async function onSubmit(values: ActivityInput) {
    const result = isEdit && activity
      ? await updateActivityAction(activity.id, values)
      : await createActivityAction(values);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(isEdit ? "Actividad actualizada" : "Actividad registrada");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" />
            Registrar actividad
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar actividad" : "Registrar actividad"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Tipo de actividad</Label>
            <Select
              value={watch("activityType")}
              onValueChange={(v) => setValue("activityType", v as ActivityInput["activityType"], { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="activityDate">Fecha</Label>
            <Input id="activityDate" type="date" {...register("activityDate")} />
            {errors.activityDate && (
              <p className="text-xs text-destructive">{errors.activityDate.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <Select value={watch("clientId")} onValueChange={(v) => setValue("clientId", v)}>
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
          </div>

          <div className="space-y-1.5">
            <Label>Proyecto</Label>
            <Select value={watch("projectId")} onValueChange={(v) => setValue("projectId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar proyecto" />
              </SelectTrigger>
              <SelectContent>
                {projectOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="result">Resultado</Label>
            <Input id="result" {...register("result")} placeholder="Ej: Reunión técnica positiva" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nextAction">Próxima acción</Label>
            <Input id="nextAction" {...register("nextAction")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nextActionDate">Fecha próxima acción</Label>
            <Input id="nextActionDate" type="date" {...register("nextActionDate")} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="comments">Comentarios</Label>
            <Textarea id="comments" rows={3} {...register("comments")} />
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
