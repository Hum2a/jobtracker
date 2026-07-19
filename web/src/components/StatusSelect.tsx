import type { Status } from "@shared/schema";
import { STATUSES } from "@shared/schema";

const LABELS: Record<Status, string> = {
  wishlist: "Wishlist",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

export function StatusSelect({
  value,
  onChange,
  disabled,
  stopDrag,
}: {
  value: Status;
  onChange: (status: Status) => void | Promise<void>;
  disabled?: boolean;
  /** Prevent board card drag from starting when interacting with the select */
  stopDrag?: boolean;
}) {
  return (
    <select
      className={`status-select ${value}`}
      value={value}
      disabled={disabled}
      aria-label="Status"
      onPointerDown={stopDrag ? (e) => e.stopPropagation() : undefined}
      onClick={stopDrag ? (e) => e.stopPropagation() : undefined}
      onChange={(e) => {
        const next = e.target.value as Status;
        if (next !== value) void onChange(next);
      }}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {LABELS[s]}
        </option>
      ))}
    </select>
  );
}
