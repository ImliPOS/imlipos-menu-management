import { Badge } from "@/components/ui/badge";
import type { SubscriptionStatus } from "@imlipos/contracts";

const VARIANTS: Record<SubscriptionStatus, "success" | "warning" | "destructive" | "default"> = {
  active: "success",
  trialing: "warning",
  expired: "default",
  cancelled: "destructive",
};

export function StatusBadge({ status }: { status: SubscriptionStatus }) {
  return <Badge variant={VARIANTS[status]}>{status}</Badge>;
}

/** Device pairing status → badge. */
export function DeviceStatusBadge({
  status,
  online,
}: {
  status: "pending" | "active" | "revoked";
  online?: boolean;
}) {
  if (status === "active") {
    return online ? (
      <Badge variant="success">online</Badge>
    ) : (
      <Badge variant="default">offline</Badge>
    );
  }
  return (
    <Badge variant={status === "pending" ? "warning" : "destructive"}>{status}</Badge>
  );
}
