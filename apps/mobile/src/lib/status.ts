import { colors } from "@/theme/tokens";

type StatusTone = {
  background: string;
  text: string;
  dot: string;
};

const statusMap: Record<string, StatusTone> = {
  ONLINE: { background: "#E5F4EB", text: colors.success, dot: colors.success },
  OFFLINE: { background: "#FBE8D6", text: colors.warning, dot: colors.warning },
  "PENDING SYNC": { background: "#F7EBD5", text: colors.warning, dot: colors.warning },
  SYNCING: { background: "#E5EEF8", text: colors.info, dot: colors.info },
  "FAILED TO SYNC": { background: "#FCE5E1", text: colors.danger, dot: colors.danger },
  "PENDING APPROVAL": { background: "#F7EBD5", text: colors.warning, dot: colors.warning },
  APPROVED: { background: "#E5F4EB", text: colors.success, dot: colors.success },
  REJECTED: { background: "#FCE5E1", text: colors.danger, dot: colors.danger },
  FLAGGED: { background: "#FCE5E1", text: colors.danger, dot: colors.danger },
  "RECONCILIATION REQUIRED": { background: "#E8E5F7", text: colors.brandSoft, dot: colors.brandSoft },
};

export function getStatusTone(status: string): StatusTone {
  return statusMap[status] ?? {
    background: "#EBF0EB",
    text: colors.inkMuted,
    dot: colors.inkMuted,
  };
}
