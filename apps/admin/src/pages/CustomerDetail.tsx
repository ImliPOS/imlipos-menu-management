import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageSpinner } from "@/components/ui/spinner";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AssignPlanDialog } from "@/components/AssignPlanDialog";
import { DeviceStatusBadge, StatusBadge } from "@/components/StatusBadge";

export function CustomerDetail() {
  const { shopId } = useParams<{ shopId: string }>();
  const customer = useQuery({
    queryKey: ["admin", "customer", shopId],
    queryFn: () => api.getCustomer(shopId!),
    enabled: !!shopId,
  });

  if (customer.isLoading) return <PageSpinner />;
  if (customer.isError || !customer.data)
    return (
      <p className="text-sm text-red-400">
        Failed to load customer: {String(customer.error ?? "not found")}
      </p>
    );
  const c = customer.data;
  const live = c.subscriptions.find(
    (s) => s.status === "active" || s.status === "trialing",
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Customers
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{c.shopName}</h1>
            <p className="text-sm text-muted-foreground">
              {c.owner.email ?? "no email"} · joined {formatDate(c.shopCreatedAt)}
            </p>
          </div>
          <AssignPlanDialog shopId={c.shopId} hasLivePlan={!!live} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(
          [
            ["Devices", c.counts.devices],
            ["Screens", c.counts.screens],
            ["Categories", c.counts.categories],
            ["Items", c.counts.items],
          ] as const
        ).map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">{label}</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent>
          <h2 className="font-medium">Subscription</h2>
          {live ? (
            <p className="mt-2 text-sm">
              <span className="font-medium">{live.planName}</span>{" "}
              <StatusBadge status={live.status} /> ·{" "}
              {live.deviceLimitOverride ?? live.planDeviceLimit} device limit · since{" "}
              {formatDate(live.startsAt)}
              {live.endsAt ? ` · ends ${formatDate(live.endsAt)}` : ""}
              {live.notes ? (
                <span className="text-muted-foreground"> · {live.notes}</span>
              ) : null}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No live subscription.
            </p>
          )}
          {c.subscriptions.length > 0 && (
            <div className="mt-4">
              <Table>
                <THead>
                  <TR>
                    <TH>Plan</TH>
                    <TH>Status</TH>
                    <TH>Starts</TH>
                    <TH>Ends</TH>
                    <TH>Notes</TH>
                  </TR>
                </THead>
                <TBody>
                  {c.subscriptions.map((s) => (
                    <TR key={s.id}>
                      <TD>{s.planName}</TD>
                      <TD>
                        <StatusBadge status={s.status} />
                      </TD>
                      <TD className="text-muted-foreground">{formatDate(s.startsAt)}</TD>
                      <TD className="text-muted-foreground">{formatDate(s.endsAt)}</TD>
                      <TD className="text-muted-foreground">{s.notes ?? "—"}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="font-medium">Devices</h2>
          {c.devices.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No devices paired.</p>
          ) : (
            <div className="mt-4">
              <Table>
                <THead>
                  <TR>
                    <TH>Name</TH>
                    <TH>Screen</TH>
                    <TH>Status</TH>
                    <TH>Last seen</TH>
                  </TR>
                </THead>
                <TBody>
                  {c.devices.map((d) => (
                    <TR key={d.id}>
                      <TD>{d.name ?? "Unnamed TV"}</TD>
                      <TD className="text-muted-foreground">{d.screenName ?? "—"}</TD>
                      <TD>
                        <DeviceStatusBadge status={d.status} online={d.online} />
                      </TD>
                      <TD className="text-muted-foreground">
                        {formatDateTime(d.lastSeenAt)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="font-medium">Screens</h2>
          {c.screens.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No screens.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {c.screens.map((s) => (
                <Badge key={s.id} variant="outline">
                  {s.name}
                  {s.location ? ` · ${s.location}` : ""}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="font-medium">Owner</h2>
          <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4 sm:block">
              <dt className="text-muted-foreground">Email</dt>
              <dd>{c.owner.email ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4 sm:block">
              <dt className="text-muted-foreground">User ID</dt>
              <dd className="break-all font-mono text-xs">{c.owner.id}</dd>
            </div>
            <div className="flex justify-between gap-4 sm:block">
              <dt className="text-muted-foreground">Signed up</dt>
              <dd>{formatDate(c.owner.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-4 sm:block">
              <dt className="text-muted-foreground">Last sign-in</dt>
              <dd>{formatDateTime(c.owner.lastSignInAt)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
