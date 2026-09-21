/**
 * Seed the single per-licence plan. Each subscription to this plan is one
 * display licence (₹3,500/mo); a shop buys one licence per display. Idempotent
 * — safe to re-run to reset the plan's price/limit. Run:
 *   pnpm --filter @imlipos/api exec tsx src/db/seedPlans.ts
 */
import { db, schema } from "./client.js";

const PLAN = {
  name: "Standard",
  description: "One display licence.",
  deviceLimit: 1,
  priceMonthly: "3500.00",
  isActive: true,
};

async function main() {
  // Upsert the single active plan (update price/limit if it already exists).
  await db
    .insert(schema.plans)
    .values(PLAN)
    .onConflictDoUpdate({
      target: schema.plans.name,
      set: {
        description: PLAN.description,
        deviceLimit: PLAN.deviceLimit,
        priceMonthly: PLAN.priceMonthly,
        isActive: true,
        updatedAt: new Date(),
      },
    });

  const rows = await db
    .select({
      name: schema.plans.name,
      priceMonthly: schema.plans.priceMonthly,
      isActive: schema.plans.isActive,
    })
    .from(schema.plans);
  console.log("Plans:", rows);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
