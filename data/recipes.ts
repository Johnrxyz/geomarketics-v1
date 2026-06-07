export interface RecipeIngredient {
  commodityName: string;
  quantity: number;
  unit: string;
  isPantryStaple?: boolean;
  fixedCost?: number; // Used if isPantryStaple is true
}

export interface Recipe {
  id: string;
  name: string;
  image: string;
  ingredients: RecipeIngredient[];
}

export const RECIPES: Recipe[] = [
  {
    id: "sinigang-baboy",
    name: "Sinigang na Baboy",
    image: "🍲",
    ingredients: [
      { commodityName: "Pork Belly", quantity: 0.5, unit: "kg" },
      { commodityName: "Tomato", quantity: 0.25, unit: "kg" },
      { commodityName: "Red Onion", quantity: 0.1, unit: "kg" },
      { commodityName: "Sinigang Mix", quantity: 1, unit: "pack", isPantryStaple: true, fixedCost: 25 },
      { commodityName: "Water Spinach (Kangkong)", quantity: 1, unit: "bundle", isPantryStaple: true, fixedCost: 15 },
    ]
  },
  {
    id: "chicken-adobo",
    name: "Chicken Adobo",
    image: "🍗",
    ingredients: [
      { commodityName: "Chicken", quantity: 0.5, unit: "kg", isPantryStaple: true, fixedCost: 100 }, // Mock chicken since it might not be in staples array yet
      { commodityName: "Garlic", quantity: 0.1, unit: "kg" },
      { commodityName: "Soy Sauce", quantity: 0.1, unit: "L", isPantryStaple: true, fixedCost: 20 },
      { commodityName: "Vinegar", quantity: 0.1, unit: "L", isPantryStaple: true, fixedCost: 15 },
      { commodityName: "Black Pepper", quantity: 1, unit: "tbsp", isPantryStaple: true, fixedCost: 5 },
    ]
  },
  {
    id: "tinolang-manok",
    name: "Tinolang Manok",
    image: "🥣",
    ingredients: [
      { commodityName: "Chicken", quantity: 0.5, unit: "kg", isPantryStaple: true, fixedCost: 100 },
      { commodityName: "Garlic", quantity: 0.05, unit: "kg" },
      { commodityName: "Red Onion", quantity: 0.1, unit: "kg" },
      { commodityName: "Ginger", quantity: 0.1, unit: "kg", isPantryStaple: true, fixedCost: 20 },
      { commodityName: "Sayote / Papaya", quantity: 1, unit: "pc", isPantryStaple: true, fixedCost: 25 },
    ]
  },
  {
    id: "paksiw-bangus",
    name: "Paksiw na Bangus",
    image: "🐟",
    ingredients: [
      { commodityName: "Bangus", quantity: 0.5, unit: "kg", isPantryStaple: true, fixedCost: 120 },
      { commodityName: "Garlic", quantity: 0.05, unit: "kg" },
      { commodityName: "Red Onion", quantity: 0.1, unit: "kg" },
      { commodityName: "Vinegar", quantity: 0.1, unit: "L", isPantryStaple: true, fixedCost: 15 },
      { commodityName: "Eggplant", quantity: 0.25, unit: "kg", isPantryStaple: true, fixedCost: 30 },
    ]
  },
  {
    id: "pinakbet",
    name: "Pinakbet",
    image: "🍆",
    ingredients: [
      { commodityName: "Pork Belly", quantity: 0.25, unit: "kg" },
      { commodityName: "Tomato", quantity: 0.2, unit: "kg" },
      { commodityName: "Garlic", quantity: 0.05, unit: "kg" },
      { commodityName: "Red Onion", quantity: 0.1, unit: "kg" },
      { commodityName: "Mixed Veggies (Squash, String Beans)", quantity: 0.5, unit: "kg", isPantryStaple: true, fixedCost: 60 },
      { commodityName: "Shrimp Paste", quantity: 1, unit: "jar", isPantryStaple: true, fixedCost: 40 },
    ]
  },
  {
    id: "menudo",
    name: "Pork Menudo",
    image: "🍛",
    ingredients: [
      { commodityName: "Pork Belly", quantity: 0.5, unit: "kg" },
      { commodityName: "Tomato", quantity: 0.25, unit: "kg" },
      { commodityName: "Garlic", quantity: 0.05, unit: "kg" },
      { commodityName: "Red Onion", quantity: 0.1, unit: "kg" },
      { commodityName: "Potato", quantity: 0.25, unit: "kg", isPantryStaple: true, fixedCost: 40 },
      { commodityName: "Carrot", quantity: 0.25, unit: "kg", isPantryStaple: true, fixedCost: 35 },
    ]
  }
];
