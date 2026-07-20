import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MonitorCheck, MonitorSmartphone, Store, UtensilsCrossed } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { PageSpinner } from "@/components/ui/spinner";

// Series colors validated for the dark card surface (CVD ΔE 69.8, ≥3:1).
const SERIES = { shops: "#3987e5", devices: "#199e70" };

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="size-4" />
          {label}
        </div>
        <div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

/** Merge the two growth series on their shared date buckets. */
function mergeGrowth(
  shops: { bucket: string; count: number }[],
  devices: { bucket: string; count: number }[],
  interval: "week" | "month",
) {
  const buckets = [...new Set([...shops, ...devices].map((p) => p.bucket))].sort();
  const by = (arr: { bucket: string; count: number }[]) =>
    Object.fromEntries(arr.map((p) => [p.bucket, p.count]));
  const s = by(shops);
  const d = by(devices);
  return buckets.map((b) => ({
    label: new Date(b).toLocaleDateString(undefined, {
      month: "short",
      ...(interval === "week" ? { day: "numeric" } : { year: "2-digit" }),
    }),
    "New customers": s[b] ?? 0,
    "New devices": d[b] ?? 0,
  }));
}

export function Overview() {
  const [interval, setInterval] = useState<"week" | "month">("month");
  const overview = useQuery({ queryKey: ["admin", "overview"], queryFn: api.overview });
  const growth = useQuery({
    queryKey: ["admin", "growth", interval],
    queryFn: () => api.growth(interval, interval === "week" ? 3 : 12),
  });

  if (overview.isLoading) return <PageSpinner />;
  if (overview.isError)
    return (
      <p className="text-sm text-red-400">
        Failed to load metrics: {String(overview.error)}
      </p>
    );
  const o = overview.data!;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Overview</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Store} label="Customers" value={o.shops} />
        <StatCard
          icon={MonitorSmartphone}
          label="Devices"
          value={o.devices.total}
          hint={Object.entries(o.devices.byStatus)
            .map(([s, n]) => `${n} ${s}`)
            .join(" · ")}
        />
        <StatCard
          icon={MonitorCheck}
          label="Devices online"
          value={o.devices.online}
          hint="heartbeat in the last 90s"
        />
        <StatCard icon={UtensilsCrossed} label="Menu items" value={o.items} />
      </div>

      <Card>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-medium">Growth</h2>
              <p className="text-sm text-muted-foreground">
                New customers and paired devices per {interval}
              </p>
            </div>
            <Select
              className="w-32"
              value={interval}
              onChange={(e) => setInterval(e.target.value as "week" | "month")}
              aria-label="Growth interval"
            >
              <option value="month">Monthly</option>
              <option value="week">Weekly</option>
            </Select>
          </div>
          <div className="mt-4 h-72">
            {growth.data ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={mergeGrowth(growth.data.shops, growth.data.devices, interval)}
                  margin={{ top: 8, right: 16, bottom: 0, left: -16 }}
                >
                  <CartesianGrid stroke="hsl(240 4% 18%)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(240 5% 65%)"
                    tickLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    stroke="hsl(240 5% 65%)"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(240 6% 10%)",
                      border: "1px solid hsl(240 4% 18%)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "hsl(0 0% 98%)" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="New customers"
                    stroke={SERIES.shops}
                    strokeWidth={2}
                    dot={{ r: 3, strokeWidth: 0, fill: SERIES.shops }}
                  />
                  <Line
                    type="monotone"
                    dataKey="New devices"
                    stroke={SERIES.devices}
                    strokeWidth={2}
                    dot={{ r: 3, strokeWidth: 0, fill: SERIES.devices }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <PageSpinner />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="font-medium">Subscriptions</h2>
          {Object.keys(o.subscriptions.byStatus).length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No subscriptions assigned yet.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-6">
              <div className="flex flex-wrap items-center gap-2">
                {Object.entries(o.subscriptions.byStatus).map(([status, n]) => (
                  <Badge key={status} variant="outline">
                    {status}: {n}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {o.subscriptions.byPlan.map((p) => (
                  <Badge key={p.planName}>
                    {p.planName}: {p.count} live
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
