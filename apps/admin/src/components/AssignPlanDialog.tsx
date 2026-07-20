import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SubscriptionStatus } from "@imlipos/contracts";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

/**
 * Assign or change a customer's plan. Replaces any live subscription (the API
 * cancels it in the same transaction, keeping it as history).
 */
export function AssignPlanDialog({
  shopId,
  hasLivePlan,
}: {
  shopId: string;
  hasLivePlan: boolean;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus>("active");
  const [notes, setNotes] = useState("");

  const plans = useQuery({
    queryKey: ["admin", "plans"],
    queryFn: api.listPlans,
    enabled: open,
  });
  const assignable = plans.data?.filter((p) => p.isActive) ?? [];

  const assign = useMutation({
    mutationFn: () =>
      api.assignSubscription(shopId, {
        planId,
        status,
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      setOpen(false);
      setPlanId("");
      setNotes("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{hasLivePlan ? "Change plan" : "Assign plan"}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{hasLivePlan ? "Change plan" : "Assign plan"}</DialogTitle>
          <DialogDescription>
            {hasLivePlan
              ? "The current live subscription will be cancelled and kept as history."
              : "Gives this customer a live subscription."}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="plan">Plan</Label>
            <Select
              id="plan"
              className="w-full"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              disabled={plans.isLoading}
            >
              <option value="" disabled>
                {plans.isLoading ? "Loading…" : "Select a plan"}
              </option>
              {assignable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.deviceLimit} device{p.deviceLimit === 1 ? "" : "s"}
                  {p.priceMonthly != null ? ` — ₹${p.priceMonthly}/yr` : ""}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              className="w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
            >
              <option value="active">active</option>
              <option value="trialing">trialing</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. comped for launch"
            />
          </div>
          {assign.isError && (
            <p className="text-sm text-red-400">{String(assign.error)}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!planId || assign.isPending}
            onClick={() => assign.mutate()}
          >
            {assign.isPending ? <Spinner /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
