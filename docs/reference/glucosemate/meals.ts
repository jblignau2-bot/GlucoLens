import type { MealPlan } from '../types';

// Fully built South Africa meal library.
// To add another country, follow the same shape and use that country's code + currency.
export const MEAL_LIBRARY: MealPlan[] = [
  {
    id: 'za-1',
    name: 'Grilled chicken with brown rice & spinach',
    cost: 55,
    currency: 'ZAR',
    carbsG: 38,
    proteinG: 35,
    calories: 480,
    diabetesNotes:
      'Lean protein + complex carbs. Spinach adds fibre to slow glucose absorption.',
    portionGuidance: '½ palm-size chicken, ½ cup brown rice, 1 cup cooked spinach.',
    diet: ['normal', 'halaal', 'gluten-free'],
    countryCode: 'ZA',
    ingredients: ['chicken breast', 'brown rice', 'spinach', 'olive oil', 'garlic'],
    tags: ['high-protein', 'fibre-rich', 'budget'],
  },
  {
    id: 'za-2',
    name: 'Tuna salad with avocado & boiled eggs',
    cost: 48,
    currency: 'ZAR',
    carbsG: 12,
    proteinG: 32,
    calories: 410,
    diabetesNotes: 'Low-carb, high-protein. Healthy fats keep you full longer.',
    portionGuidance: '1 tin tuna, ½ avocado, 2 eggs, 2 cups mixed leaves.',
    diet: ['normal', 'low-carb', 'gluten-free', 'halaal', 'kosher'],
    countryCode: 'ZA',
    ingredients: ['tuna', 'avocado', 'eggs', 'lettuce', 'lemon'],
    tags: ['low-carb', 'quick', 'budget'],
  },
  {
    id: 'za-3',
    name: 'Lentil & vegetable curry with brown rice',
    cost: 35,
    currency: 'ZAR',
    carbsG: 55,
    proteinG: 18,
    calories: 460,
    diabetesNotes:
      'Plant-based protein with slow-release carbs. Watch portions on rice.',
    portionGuidance: '1 cup curry, ½ cup rice.',
    diet: ['normal', 'vegetarian', 'halaal', 'kosher', 'gluten-free'],
    countryCode: 'ZA',
    ingredients: ['lentils', 'mixed veg', 'tomato', 'onion', 'curry spices', 'brown rice'],
    tags: ['vegetarian', 'fibre-rich', 'budget'],
  },
  {
    id: 'za-4',
    name: 'Oats with Greek yoghurt & berries',
    cost: 28,
    currency: 'ZAR',
    carbsG: 42,
    proteinG: 14,
    calories: 360,
    diabetesNotes:
      'Steel-cut or rolled oats only — instant oats spike glucose faster.',
    portionGuidance: '½ cup dry oats, ½ cup yoghurt, small handful berries.',
    diet: ['normal', 'vegetarian', 'halaal', 'kosher'],
    countryCode: 'ZA',
    ingredients: ['rolled oats', 'greek yoghurt', 'berries', 'cinnamon'],
    tags: ['breakfast', 'fibre-rich', 'budget'],
  },
  {
    id: 'za-5',
    name: 'Pap & chicken livers with side salad',
    cost: 42,
    currency: 'ZAR',
    carbsG: 48,
    proteinG: 28,
    calories: 510,
    diabetesNotes:
      'Pap is a refined carb — keep portion small and pair with greens.',
    portionGuidance: '½ cup pap, 1 cup livers, generous salad.',
    diet: ['normal', 'halaal'],
    countryCode: 'ZA',
    ingredients: ['maize meal', 'chicken livers', 'tomato', 'onion', 'lettuce'],
    tags: ['traditional', 'budget'],
  },
  {
    id: 'za-6',
    name: 'Bean stew with brown rice',
    cost: 30,
    currency: 'ZAR',
    carbsG: 60,
    proteinG: 18,
    calories: 470,
    diabetesNotes:
      'Beans are a glucose-friendly slow carb. Skip the white bread side.',
    portionGuidance: '1 cup stew, ½ cup brown rice.',
    diet: ['normal', 'vegetarian', 'halaal', 'kosher', 'gluten-free'],
    countryCode: 'ZA',
    ingredients: ['kidney beans', 'brown rice', 'tomato', 'onion', 'paprika'],
    tags: ['vegetarian', 'fibre-rich', 'budget'],
  },
  {
    id: 'za-7',
    name: 'Biltong, cheese & cucumber snack plate',
    cost: 65,
    currency: 'ZAR',
    carbsG: 6,
    proteinG: 30,
    calories: 380,
    diabetesNotes: 'Practically zero glucose impact. Great for snack/lunch.',
    portionGuidance: '40g biltong, 30g cheese, 1 cup cucumber.',
    diet: ['normal', 'low-carb', 'gluten-free', 'halaal'],
    countryCode: 'ZA',
    ingredients: ['biltong', 'cheddar', 'cucumber'],
    tags: ['low-carb', 'snack'],
  },
  {
    id: 'za-8',
    name: 'Vegetarian lentil bobotie with yellow rice',
    cost: 50,
    currency: 'ZAR',
    carbsG: 58,
    proteinG: 19,
    calories: 510,
    diabetesNotes:
      'Lentils replace mince — better fibre. Watch turmeric rice portion.',
    portionGuidance: '1 cup bobotie, ½ cup rice.',
    diet: ['normal', 'vegetarian', 'halaal', 'kosher'],
    countryCode: 'ZA',
    ingredients: ['lentils', 'yellow rice', 'egg', 'milk', 'curry spices'],
    tags: ['traditional', 'vegetarian'],
  },
  {
    id: 'za-9',
    name: 'Beef & vegetable stir-fry (no rice)',
    cost: 75,
    currency: 'ZAR',
    carbsG: 14,
    proteinG: 36,
    calories: 440,
    diabetesNotes: 'Low-carb high-protein. Skip sweet sauces.',
    portionGuidance: '½ palm beef, 2 cups veggies.',
    diet: ['normal', 'low-carb', 'gluten-free', 'halaal'],
    countryCode: 'ZA',
    ingredients: ['beef strips', 'broccoli', 'pepper', 'onion', 'soy sauce', 'ginger'],
    tags: ['low-carb', 'high-protein'],
  },
  {
    id: 'za-10',
    name: 'Egg & avocado wholewheat wrap',
    cost: 32,
    currency: 'ZAR',
    carbsG: 30,
    proteinG: 18,
    calories: 380,
    diabetesNotes:
      'Wholewheat wrap > white. Add veggies for extra fibre.',
    portionGuidance: '1 wrap, 2 eggs, ½ avocado.',
    diet: ['normal', 'vegetarian', 'halaal', 'kosher'],
    countryCode: 'ZA',
    ingredients: ['wholewheat wrap', 'eggs', 'avocado', 'tomato', 'lettuce'],
    tags: ['breakfast', 'budget', 'quick'],
  },
];

export const filterMeals = (
  meals: MealPlan[],
  opts: {
    countryCode: string;
    budget: number;
    diet: string;
    allergies: string[];
  }
) => {
  return meals.filter((m) => {
    if (m.countryCode !== opts.countryCode) return false;
    if (m.cost > opts.budget * 1.5) return false; // soft cap
    if (!m.diet.includes(opts.diet as any)) return false;
    if (
      opts.allergies.some((a) =>
        m.ingredients.some((i) => i.toLowerCase().includes(a.toLowerCase()))
      )
    )
      return false;
    return true;
  });
};
