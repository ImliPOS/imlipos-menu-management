import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Plan } from "@imlipos/contracts";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSpinner, Spinner } from "@/components/ui/spinner";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

/**
 * Single-plan admin: ImliPos sells one plan (a per-display licence). The only
 * action is editing its pricing — no adding, retiring, or extra plans.
 */
export function Plans() {
  const queryClient = useQueryClient();
  const plans = useQuery({ queryKey: ["admin", "plans"], queryFn: api.listPlans });
  const activePlans = plans.data?.filter((p) => p.isActive) ?? [];

  const [editing, setEditing] = useState<Plan | null>(null);
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  const openEdit = (plan: Plan) => {
    setEditing(plan);
    setPrice(plan.priceMonthly == null ? "" : String(plan.priceMonthly));
    setDescription(plan.description ?? "");
  };

  const save = useMutation({
    mutationFn: () =>
      api.updatePlan(editing!.id, {
        priceMonthly: price === "" ? null : Number(price),
        description: description.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
      setEditing(null);
    },
  });

  const priceValid = price !== "" && Number(price) >= 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Plan</h1>

      {plans.isLoading ? (
        <PageSpinner />
      ) : plans.isError ? (
        <p className="text-sm text-red-400">Failed to load: {String(plans.error)}</p>
      ) : activePlans.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active plan.</p>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Description</TH>
              <TH className="text-right">Price / year</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {activePlans.map((p) => (
              <TR key={p.id}>
                <TD className="font-medium">{p.name}</TD>
                <TD className="text-muted-foreground">{p.description ?? "—"}</TD>
                <TD className="text-right tabular-nums">
                  {p.priceMonthly == null
                    ? "—"
                    : `₹${p.priceMonthly.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}`}
                </TD>
                <TD className="text-right">
                  <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                    Edit pricing
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editing?.name} pricing</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="price">Price / year (₹)</Label>
              <Input
                id="price"
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Charged per display licence. Applies to new purchases; existing
                subscriptions keep their agreed price until renewal.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {save.isError && (
              <p className="text-sm text-red-400">{String(save.error)}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button disabled={!priceValid || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? <Spinner /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
