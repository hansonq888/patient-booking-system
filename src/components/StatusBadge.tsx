import { BookingStatus } from "@/lib/types";

const config: Record<BookingStatus, { label: string; outer: string; dot: string }> = {
  PENDING: {
    label: "Pending",
    outer: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
  },
  CONFIRMED: {
    label: "Confirmed",
    outer: "bg-green-50 text-green-700 border border-green-200",
    dot: "bg-green-500",
  },
  CANCELLED: {
    label: "Cancelled",
    outer: "bg-slate-100 text-slate-500 border border-slate-200",
    dot: "bg-slate-400",
  },
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const { label, outer, dot } = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${outer}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
