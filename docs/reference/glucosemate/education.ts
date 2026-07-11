export interface GuideSection {
  id: string;
  title: string;
  summary: string;
  body: string[];
}

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'what-is',
    title: 'What is diabetes?',
    summary: 'A condition where your body struggles to manage blood glucose.',
    body: [
      'Diabetes is a long-term condition where the body either does not produce enough insulin, or cannot use insulin properly. Insulin is the hormone that lets glucose (sugar) move from your bloodstream into your cells for energy.',
      'When insulin is missing or not working, glucose builds up in the blood. Over time, high glucose can damage nerves, eyes, kidneys, and the heart.',
      'The good news: diabetes is highly manageable with the right combination of food, activity, monitoring, and (often) medication.',
    ],
  },
  {
    id: 'types',
    title: 'Type 1 vs Type 2 vs Prediabetes',
    summary: 'Different causes, different management strategies.',
    body: [
      'Type 1: an autoimmune condition. The body destroys insulin-producing cells. Insulin therapy is required for life.',
      'Type 2: the body becomes resistant to insulin or does not make enough. Often linked to weight, activity, and genetics. Managed with food, activity, oral medication and sometimes insulin.',
      'Prediabetes: glucose is higher than normal but not yet diabetes. With early action (food + activity changes) it is often reversible.',
      'Gestational: develops during pregnancy and usually resolves after birth, but raises future Type 2 risk.',
    ],
  },
  {
    id: 'affects',
    title: 'What affects glucose?',
    summary: 'More than just sugar.',
    body: [
      'Carbohydrates (rice, bread, pap, fruit, sugar) raise glucose the most.',
      'Stress, illness, and poor sleep can raise glucose.',
      'Exercise generally lowers glucose. Strength training and walking are great low-risk options.',
      'Some medications (e.g. cortisone) raise glucose.',
      'Dehydration can concentrate blood sugar — drink water consistently.',
    ],
  },
  {
    id: 'carbs',
    title: 'Understanding carbs and sugar',
    summary: 'Quality and quantity both matter.',
    body: [
      'Simple carbs (white bread, sweets, fruit juice) spike glucose fast.',
      'Complex carbs (oats, brown rice, beans, lentils) digest slower and cause smaller spikes.',
      'Pairing carbs with protein, fat or fibre slows the spike.',
      'Aim for consistent carb amounts at each meal — wild swings make management harder.',
    ],
  },
  {
    id: 'plate',
    title: 'The healthy plate method',
    summary: 'A simple visual guide for any meal.',
    body: [
      'Half your plate: non-starchy vegetables (spinach, broccoli, peppers, salad).',
      'A quarter: lean protein (chicken, fish, eggs, beans, tofu).',
      'A quarter: complex carbs (brown rice, sweet potato, wholegrain).',
      'Add a small portion of healthy fat (avocado, olive oil, nuts).',
      'Drink water — skip sugary drinks and most fruit juices.',
    ],
  },
  {
    id: 'exercise',
    title: 'Exercise and diabetes',
    summary: 'Move daily — anything counts.',
    body: [
      'Walking 20–30 minutes after meals significantly reduces post-meal glucose spikes.',
      'Strength training 2–3x per week improves insulin sensitivity.',
      'Always carry a fast-acting carb (juice, glucose tabs) if on insulin or medication that can cause lows.',
      'Speak to your doctor before starting a new exercise programme, especially if your readings are unstable.',
    ],
  },
  {
    id: 'warning',
    title: 'Warning signs to watch for',
    summary: 'Know when to act fast.',
    body: [
      'LOW glucose (hypo) signs: shakiness, sweating, confusion, dizziness, irritability, racing heart, hunger. Treat with 15g fast carb (juice, glucose tabs), wait 15 minutes, retest.',
      'HIGH glucose signs: extreme thirst, frequent urination, blurred vision, deep heavy breathing, fruity breath, nausea, vomiting.',
      'Severe symptoms (confusion, fainting, chest pain, seizures, can\'t keep fluids down): treat as a medical emergency. Call your local emergency number or go to A&E immediately.',
    ],
  },
  {
    id: 'doctor',
    title: 'Questions to ask your doctor',
    summary: 'Make every appointment count.',
    body: [
      'What are my target glucose ranges (fasting, before meal, after meal, bedtime)?',
      'What is my HbA1c and what target should we aim for?',
      'How should I adjust food/medication if I exercise?',
      'What signs mean I should call you or go to the hospital?',
      'How often should I check my glucose at home?',
      'Are my current medications still the best fit?',
    ],
  },
  {
    id: 'myths',
    title: 'Myths vs facts',
    summary: 'Don\'t let bad information run your decisions.',
    body: [
      'MYTH: "Diabetes is caused by eating sugar." FACT: Type 2 has many causes — genetics, weight, activity, age. Sugar is only one factor.',
      'MYTH: "People with diabetes can never eat carbs." FACT: They can — portion size and pairing matter more than total avoidance.',
      'MYTH: "If I feel fine, my glucose is fine." FACT: High glucose often has no symptoms until damage is done. Test, don\'t guess.',
      'MYTH: "Insulin means you failed." FACT: Insulin is just a tool. Many people need it, and that\'s OK.',
    ],
  },
];
