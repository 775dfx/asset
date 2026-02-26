import type { StatusMessage } from "../types";

const statusStyles: Record<StatusMessage["state"], string> = {
  idle: "bg-white/5 border-white/10 text-slate-300",
  loading: "bg-blue-500/10 border-blue-500/40 text-blue-200",
  success: "bg-emerald-500/10 border-emerald-500/40 text-emerald-200",
  error: "bg-rose-500/10 border-rose-500/40 text-rose-200",
};

export const StatusBanner = ({ state, message }: StatusMessage) => (
  <div
    className={`rounded-2xl border px-4 py-3 text-sm ${statusStyles[state]}`}
  >
    {message}
  </div>
);
