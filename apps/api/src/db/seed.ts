/**
 * Seed ~320 menu items across ~16 categories into every shop (non-destructive —
 * existing categories/items are left untouched). Run:
 *   pnpm --filter @imlipos/api exec tsx src/db/seed.ts
 */
import { db, schema } from "./client.js";
import { sql } from "drizzle-orm";

// 16 categories x 20 items = 320 items per shop. [priceMin, priceMax] sets a
// realistic range; each item's price is spread evenly across it.
const MENU: Array<{ category: string; min: number; max: number; items: string[] }> = [
  {
    category: "Soups",
    min: 90,
    max: 180,
    items: [
      "Sweet Corn Soup", "Hot & Sour Soup", "Manchow Soup", "Tomato Shorba",
      "Cream of Mushroom", "Veg Clear Soup", "Lemon Coriander Soup", "Thai Veg Soup",
      "Spinach Soup", "Broccoli Almond Soup", "Wonton Soup", "Chicken Hot & Sour",
      "Chicken Manchow", "Chicken Clear Soup", "Pepper Chicken Soup", "Tom Yum Veg",
      "Murgh Shorba", "Dal Shorba", "Carrot Ginger Soup", "Roasted Pumpkin Soup",
    ],
  },
  {
    category: "Veg Starters",
    min: 180,
    max: 320,
    items: [
      "Veg Spring Roll", "Crispy Corn", "Chilli Paneer", "Honey Chilli Potato",
      "Veg Manchurian", "Paneer 65", "Mushroom Salt & Pepper", "Gobi Manchurian",
      "Hara Bhara Kabab", "Veg Seekh Kabab", "Cheese Corn Balls", "Crispy Babycorn",
      "Paneer Tikka", "Achari Paneer Tikka", "Malai Soya Chaap", "Tandoori Aloo",
      "Stuffed Mushroom", "Veg Lollipop", "Chilli Mushroom", "Cheese Garlic Bites",
    ],
  },
  {
    category: "Non-Veg Starters",
    min: 220,
    max: 420,
    items: [
      "Chicken 65", "Chilli Chicken", "Chicken Lollipop", "Drums of Heaven",
      "Chicken Manchurian", "Pepper Chicken", "Garlic Chicken", "Chicken Spring Roll",
      "Fish Amritsari", "Fish Tikka", "Apollo Fish", "Prawn Koliwada",
      "Chilli Prawns", "Mutton Seekh Kabab", "Chicken Seekh Kabab", "Egg Manchurian",
      "Chicken Wings", "Schezwan Chicken", "Golden Fried Prawns", "Tandoori Chicken Wings",
    ],
  },
  {
    category: "Tandoori",
    min: 260,
    max: 520,
    items: [
      "Tandoori Chicken Half", "Tandoori Chicken Full", "Chicken Malai Tikka", "Chicken Tikka",
      "Afghani Chicken Tikka", "Chicken Reshmi Kabab", "Tangdi Kabab", "Mutton Boti Kabab",
      "Tandoori Pomfret", "Tandoori Prawns", "Paneer Malai Tikka", "Paneer Tikka Achari",
      "Soya Chaap Tikka", "Tandoori Mushroom", "Tandoori Broccoli", "Mixed Tandoori Platter",
      "Chicken Pahadi Tikka", "Lasooni Tikka", "Hariyali Chicken Tikka", "Tandoori Aloo Stuffed",
    ],
  },
  {
    category: "Paneer Specials",
    min: 220,
    max: 360,
    items: [
      "Paneer Butter Masala", "Kadai Paneer", "Palak Paneer", "Shahi Paneer",
      "Paneer Tikka Masala", "Matar Paneer", "Paneer Bhurji", "Paneer Lababdar",
      "Methi Malai Paneer", "Paneer Do Pyaza", "Chilli Paneer Gravy", "Paneer Korma",
      "Paneer Pasanda", "Achari Paneer", "Paneer Handi", "Paneer Kofta",
      "Malai Paneer", "Paneer Makhani", "Paneer Jalfrezi", "Hyderabadi Paneer",
    ],
  },
  {
    category: "Main Course Veg",
    min: 180,
    max: 320,
    items: [
      "Dal Makhani", "Dal Tadka", "Dal Fry", "Mix Veg",
      "Veg Kolhapuri", "Aloo Gobi", "Bhindi Masala", "Veg Kofta",
      "Malai Kofta", "Navratan Korma", "Veg Jalfrezi", "Chana Masala",
      "Rajma Masala", "Aloo Matar", "Baingan Bharta", "Veg Handi",
      "Kaju Curry", "Methi Matar Malai", "Veg Makhanwala", "Stuffed Capsicum",
    ],
  },
  {
    category: "Main Course Non-Veg",
    min: 240,
    max: 460,
    items: [
      "Butter Chicken", "Chicken Curry", "Kadai Chicken", "Chicken Tikka Masala",
      "Chicken Korma", "Chicken Chettinad", "Murgh Lababdar", "Chicken Do Pyaza",
      "Chicken Handi", "Mutton Rogan Josh", "Mutton Curry", "Mutton Kadai",
      "Mutton Korma", "Fish Curry", "Goan Fish Curry", "Prawn Masala",
      "Egg Curry", "Chicken Saag", "Hyderabadi Chicken", "Andhra Chicken",
    ],
  },
  {
    category: "Rice & Biryani",
    min: 160,
    max: 420,
    items: [
      "Jeera Rice", "Steamed Rice", "Veg Pulao", "Kashmiri Pulao",
      "Veg Biryani", "Hyderabadi Veg Biryani", "Paneer Biryani", "Mushroom Biryani",
      "Chicken Biryani", "Hyderabadi Chicken Biryani", "Mutton Biryani", "Egg Biryani",
      "Prawn Biryani", "Chicken Fried Rice", "Veg Fried Rice", "Schezwan Fried Rice",
      "Egg Fried Rice", "Curd Rice", "Lemon Rice", "Ghee Rice",
    ],
  },
  {
    category: "Breads",
    min: 30,
    max: 120,
    items: [
      "Tandoori Roti", "Butter Roti", "Plain Naan", "Butter Naan",
      "Garlic Naan", "Cheese Naan", "Lachha Paratha", "Pudina Paratha",
      "Aloo Paratha", "Paneer Paratha", "Missi Roti", "Kulcha",
      "Amritsari Kulcha", "Stuffed Naan", "Rumali Roti", "Bhatura",
      "Tandoori Paratha", "Chilli Garlic Naan", "Keema Naan", "Cheese Garlic Naan",
    ],
  },
  {
    category: "Indo-Chinese",
    min: 160,
    max: 320,
    items: [
      "Veg Hakka Noodles", "Chicken Hakka Noodles", "Schezwan Noodles", "Singapore Noodles",
      "Chilli Garlic Noodles", "Veg Chowmein", "Chicken Chowmein", "Triple Schezwan Rice",
      "Veg Manchurian Dry", "Chicken Manchurian Dry", "Paneer Chilli Dry", "Crispy Veg",
      "American Chopsuey", "Chinese Bhel", "Veg Spring Roll Chinese", "Dragon Chicken",
      "Kung Pao Chicken", "Chilli Garlic Prawns", "Schezwan Paneer", "Hong Kong Noodles",
    ],
  },
  {
    category: "South Indian",
    min: 90,
    max: 220,
    items: [
      "Plain Dosa", "Masala Dosa", "Onion Dosa", "Rava Dosa",
      "Rava Masala Dosa", "Mysore Masala Dosa", "Ghee Roast Dosa", "Paneer Dosa",
      "Cheese Dosa", "Set Dosa", "Idli Sambar", "Medu Vada",
      "Rava Idli", "Ven Pongal", "Uttapam", "Onion Uttapam",
      "Tomato Uttapam", "Vada Sambar", "Bisi Bele Bath", "Upma",
    ],
  },
  {
    category: "Rolls & Wraps",
    min: 120,
    max: 260,
    items: [
      "Veg Roll", "Paneer Roll", "Aloo Roll", "Paneer Tikka Roll",
      "Veg Kathi Roll", "Chicken Roll", "Chicken Tikka Roll", "Egg Roll",
      "Double Egg Roll", "Chicken Seekh Roll", "Mutton Seekh Roll", "Schezwan Paneer Roll",
      "Schezwan Chicken Roll", "Cheese Corn Roll", "Falafel Wrap", "Hariyali Chicken Wrap",
      "Tandoori Veg Wrap", "Egg Chicken Roll", "Masala Egg Roll", "Mexican Veg Wrap",
    ],
  },
  {
    category: "Burgers & Sandwiches",
    min: 90,
    max: 240,
    items: [
      "Veg Burger", "Aloo Tikki Burger", "Paneer Burger", "Cheese Burger",
      "Crispy Veg Burger", "Chicken Burger", "Crispy Chicken Burger", "Grilled Chicken Burger",
      "Veg Cheese Sandwich", "Grilled Sandwich", "Bombay Masala Sandwich", "Paneer Tikka Sandwich",
      "Corn Cheese Sandwich", "Club Sandwich", "Chicken Sandwich", "Chicken Tikka Sandwich",
      "Egg Sandwich", "Tandoori Paneer Sandwich", "Veg Junglee Sandwich", "Cheese Chilli Toast",
    ],
  },
  {
    category: "Pizzas",
    min: 160,
    max: 420,
    items: [
      "Margherita Pizza", "Onion Capsicum Pizza", "Farmhouse Pizza", "Veg Supreme Pizza",
      "Paneer Tikka Pizza", "Corn Cheese Pizza", "Mexican Veg Pizza", "Cheese Burst Veg",
      "Tandoori Paneer Pizza", "Spicy Veg Pizza", "Chicken Tikka Pizza", "BBQ Chicken Pizza",
      "Chicken Supreme Pizza", "Peri Peri Chicken Pizza", "Double Cheese Margherita", "Veggie Delight",
      "Paneer Makhani Pizza", "Schezwan Paneer Pizza", "Chicken Sausage Pizza", "Loaded Cheese Pizza",
    ],
  },
  {
    category: "Desserts",
    min: 80,
    max: 240,
    items: [
      "Gulab Jamun", "Rasmalai", "Gajar Halwa", "Moong Dal Halwa",
      "Jalebi", "Rabri", "Kheer", "Phirni",
      "Kulfi Falooda", "Brownie", "Hot Brownie with Ice Cream", "Chocolate Lava Cake",
      "Sizzling Brownie", "Fruit Custard", "Caramel Custard", "Gajar ka Halwa with Rabri",
      "Shahi Tukda", "Malai Sandwich", "Cheesecake Slice", "Tiramisu",
    ],
  },
  {
    category: "Beverages",
    min: 50,
    max: 220,
    items: [
      "Masala Chai", "Filter Coffee", "Cold Coffee", "Cappuccino",
      "Sweet Lassi", "Salted Lassi", "Mango Lassi", "Fresh Lime Soda",
      "Masala Soda", "Buttermilk", "Cold Drink", "Mango Shake",
      "Banana Shake", "Chocolate Shake", "Oreo Shake", "Strawberry Shake",
      "Watermelon Juice", "Orange Juice", "Pineapple Juice", "Mosambi Juice",
    ],
  },
];

const SHOP_SORT_BASE = 100; // place new categories after any existing ones

function priceFor(min: number, max: number, i: number, n: number): string {
  const span = max - min;
  const v = Math.round((min + (span * i) / Math.max(1, n - 1)) / 5) * 5;
  return v.toFixed(2);
}

// Guard: refuse to seed unless the data is exactly 320 items / 16 categories.
const perCat = MENU.map((m) => m.items.length);
const total = perCat.reduce((a, b) => a + b, 0);
const bad = MENU.filter((m) => m.items.length !== 20).map((m) => m.category);
if (MENU.length !== 16 || total !== 320 || bad.length) {
  console.error(
    `Aborting: expected 16 categories x 20 = 320 items. Got ${MENU.length} categories, ${total} items.` +
      (bad.length ? ` Categories not 20: ${bad.join(", ")}` : ""),
  );
  process.exit(1);
}

const shops = await db.select({ id: schema.shops.id, name: schema.shops.name }).from(schema.shops);
console.log(`Seeding ${MENU.length} categories x 20 items into ${shops.length} shops...\n`);

let grandItems = 0;
for (const shop of shops) {
  let shopItems = 0;
  for (let c = 0; c < MENU.length; c++) {
    const def = MENU[c]!;
    const [cat] = await db
      .insert(schema.categories)
      .values({
        shopId: shop.id,
        name: def.category,
        sortOrder: SHOP_SORT_BASE + c,
        isAvailable: true,
      })
      .returning({ id: schema.categories.id });
    const rows = def.items.map((name, i) => ({
      shopId: shop.id,
      categoryId: cat!.id,
      name,
      price: priceFor(def.min, def.max, i, def.items.length),
      isAvailable: true,
      sortOrder: i,
    }));
    await db.insert(schema.items).values(rows);
    shopItems += rows.length;
  }
  grandItems += shopItems;
  console.log(`  ${shop.name}: +${MENU.length} categories, +${shopItems} items`);
}
console.log(`\nDone. Inserted ${grandItems} items total across ${shops.length} shops.`);
process.exit(0);
