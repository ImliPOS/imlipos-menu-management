import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SubscriptionStatus } from "@imlipos/contracts";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { PageSpinner } from "@/components/ui/spinner";
import { Select } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";

const STATUSES: SubscriptionStatus[] = ["trialing", "active", "expired", "cancelled"];

export function Subscriptions() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<SubscriptionStatus | "">("");

  const subs = useQuery({
    queryKey: ["admin", "subscriptions", filter],
    queryFn: () => api.listSubscriptions(filter || undefined),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SubscriptionStatus }) =>
      api.updateSubscription(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Subscriptions</h1>
        <Select
          className="w-40"
          value={filter}
          onChange={(e) => setFilter(e.target.value as SubscriptionStatus | "")}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {subs.isLoading ? (
        <PageSpinner />
      ) : subs.isError ? (
        <p className="text-sm text-red-400">Failed to load: {String(subs.error)}</p>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Customer</TH>
              <TH>Plan</TH>
              <TH>Status</TH>
              <TH>Starts</TH>
              <TH>Ends</TH>
              <TH className="text-right">Device limit</TH>
              <TH>Set status</TH>
            </TR>
          </THead>
          <TBody>
            {subs.data!.map((s) => (
              <TR key={s.id}>
                <TD>
                  <Link to={`/customers/${s.shopId}`} className="hover:underline">
                    {s.shopName ?? s.shopId}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {s.ownerEmail ?? ""}
                  </div>
                </TD>
                <TD>{s.planName}</TD>
                <TD>
                  <StatusBadge status={s.status} />
                </TD>
                <TD className="text-muted-foreground">{formatDate(s.startsAt)}</TD>
                <TD className="text-muted-foreground">{formatDate(s.endsAt)}</TD>
                <TD className="text-right tabular-nums">
                  {s.deviceLimitOverride ?? s.planDeviceLimit}
                </TD>
                <TD>
                  <Select
                    className="w-32"
                    value={s.status}
                    disabled={updateStatus.isPending}
                    onChange={(e) =>
                      updateStatus.mutate({
                        id: s.id,
                        status: e.target.value as SubscriptionStatus,
                      })
                    }
                    aria-label={`Status for ${s.shopName ?? s.id}`}
                  >
                    {STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </Select>
                </TD>
              </TR>
            ))}
            {subs.data!.length === 0 && (
              <TR>
                <TD colSpan={7} className="py-8 text-center text-muted-foreground">
                  No subscriptions{filter ? ` with status “${filter}”` : ""}.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      )}
    </div>
  );
}
