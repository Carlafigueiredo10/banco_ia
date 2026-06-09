import { labelStatus, labelEstagio, corStatus } from "@/lib/labels";

const CORES: Record<string, { bg: string; fg: string }> = {
  success: { bg: "#d4edda", fg: "#155724" },
  warning: { bg: "#fff3cd", fg: "#856404" },
  info: { bg: "#d1ecf1", fg: "#0c5460" },
  danger: { bg: "#f8d7da", fg: "#721c24" },
};

export function StatusBadge({ value }: { value: string | null }) {
  const c = CORES[corStatus(value)] ?? CORES.info;
  return (
    <span style={{ background: c.bg, color: c.fg, borderRadius: 12, padding: "2px 10px", fontSize: ".8rem", fontWeight: 600, whiteSpace: "nowrap" }}>
      {labelStatus(value)}
    </span>
  );
}

export function EstagioBadge({ value }: { value: string | null }) {
  const perigo = value === "inconsistente";
  const c = perigo ? CORES.danger : { bg: "#eef0f4", fg: "#333" };
  return (
    <span style={{ background: c.bg, color: c.fg, borderRadius: 12, padding: "2px 10px", fontSize: ".8rem", whiteSpace: "nowrap" }}>
      {labelEstagio(value)}
    </span>
  );
}
