import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { ScreenContent } from "@imlipos/contracts";
import { db, schema } from "../db/client.js";

const { screens, screenCategories, categories, items } = schema;

/** Screens (for a shop) that display a given category — used to target sockets. */
export async function screensShowingCategory(
  shopId: string,
  categoryId: string,
): Promise<string[]> {
  const rows = await db
    .select({ screenId: screenCategories.screenId })
    .from(screenCategories)
    .innerJoin(screens, eq(screens.id, screenCategories.screenId))
    .where(
      and(
        eq(screenCategories.categoryId, categoryId),
        eq(screens.shopId, shopId),
      ),
    );
  return rows.map((r) => r.screenId);
}

/** Bump a screen's version (call after any change affecting it). Returns new version. */
export async function bumpScreenVersion(screenId: string): Promise<number> {
  const [row] = await db
    .update(screens)
    .set({ version: sql`${screens.version} + 1`, updatedAt: new Date() })
    .where(eq(screens.id, screenId))
    .returning({ version: screens.version });
  return row?.version ?? 1;
}

/** Build the full content payload a TV renders for one screen. */
export async function buildScreenContent(
  shopId: string,
  screenId: string,
): Promise<ScreenContent | null> {
  const [screen] = await db
    .select()
    .from(screens)
    .where(and(eq(screens.id, screenId), eq(screens.shopId, shopId)))
    .limit(1);
  if (!screen) return null;

  const assigned = await db
    .select({
      categoryId: screenCategories.categoryId,
      sortOrder: screenCategories.sortOrder,
    })
    .from(screenCategories)
    .where(eq(screenCategories.screenId, screenId))
    .orderBy(asc(screenCategories.sortOrder));

  const catIds = assigned.map((a) => a.categoryId);
  const cats = catIds.length
    ? await db.select().from(categories).where(inArray(categories.id, catIds))
    : [];
  const its = catIds.length
    ? await db
        .select()
        .from(items)
        .where(inArray(items.categoryId, catIds))
        .orderBy(asc(items.sortOrder))
    : [];

  const catById = new Map(cats.map((c) => [c.id, c]));

  const payloadCats = assigned
    .map((a) => {
      const c = catById.get(a.categoryId);
      if (!c) return null;
      return {
        id: c.id,
        name: c.name,
        sortOrder: a.sortOrder,
        isAvailable: c.isAvailable,
        items: its
          .filter((i) => i.categoryId === c.id)
          .map((i) => ({
            id: i.id,
            name: i.name,
            description: i.description,
            price: Number(i.price),
            mediaUrl: i.mediaUrl,
            mediaType: i.mediaType,
            isAvailable: i.isAvailable,
            sortOrder: i.sortOrder,
          })),
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  return {
    screen: {
      id: screen.id,
      shopId: screen.shopId,
      name: screen.name,
      location: screen.location,
      orientation: screen.orientation,
      theme: screen.theme,
      createdAt: screen.createdAt.toISOString(),
      updatedAt: screen.updatedAt.toISOString(),
    },
    categories: payloadCats,
    version: screen.version,
  };
}
