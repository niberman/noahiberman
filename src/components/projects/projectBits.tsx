import { STATUS_LABEL, type ProjectStatus } from "@/data/projectsCatalog";
import type { DemoHealth } from "@/hooks/useDemoStatus";

/** Shared atoms for the projects pages. */

/** #rrggbb -> rgba() at the given alpha. */
export function hexA(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const STATUS_TINT: Record<ProjectStatus, string> = {
  "in use": "#7fe8c6",
  parked: "#b48cf0",
  "in progress": "#ffcf7a",
  closed: "#a79fb8",
};

export function StatusBadge({
  status,
  note,
  className = "",
}: {
  status: ProjectStatus;
  note?: string | null;
  className?: string;
}) {
  const tint = STATUS_TINT[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase leading-none tracking-[.22em] ${className}`}
      style={{
        color: tint,
        borderColor: hexA(tint, 0.35),
        backgroundColor: hexA(tint, 0.08),
      }}
    >
      {note ?? STATUS_LABEL[status]}
    </span>
  );
}

export function UptimeDot({ health }: { health: DemoHealth }) {
  const tint = health === "online" ? "#7fe8c6" : "#ff8d8d";
  return (
    <span
      aria-hidden
      className="inline-block h-1.5 w-1.5 rounded-full"
      style={{ backgroundColor: tint, boxShadow: `0 0 10px ${hexA(tint, 0.8)}` }}
    />
  );
}
