import { PROJECT_STATUS_COLOR, PROJECT_STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types";

export function StatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        PROJECT_STATUS_COLOR[status],
        className,
      )}
    >
      {PROJECT_STATUS_LABEL[status]}
    </span>
  );
}
