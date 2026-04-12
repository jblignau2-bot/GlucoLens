/**
 * Glucose Guide — Educational hub for diabetes management
 *
 * 4 categories: Type 2, Type 1, Pre-Diabetes, Healthy Lifestyle
 * Each with expandable educational cards covering key topics.
 */

import {
  View,
  Text,
  ScrollView,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { colors, radius } from "@/constants/tokens";
import {
  Heart,
  Syringe,
  AlertTriangle,
  Leaf,
  BookOpen,
  Clock,
  Apple,
  Ban,
  ShieldCheck,
  Pill,
  Activity,
  Droplets,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";

// ─── Guide Data ─────────────────────────────────────────────────────────────

type GuideCategory = {
  id: string;
  title: string;
  icon: any;
  color: string;
  cards: { title: string; icon: any; content: string }[];
};

const GUIDE_DATA: GuideCategory[] = [
  {
    id: "type2",
    title: "Type 2 Diabetes",
    icon: Heart,
    color: "#ef4444",
    cards: [
      { title: "What Is Type 2?", icon: BookOpen, content: "Type 2 diabetes is a chronic condition where your body doesn't use insulin properly (insulin resistance). Your pancreas makes insulin, but your cells don't respond to it effectively. This causes blood sugar to build up in your bloodstream instead of being used for energy. It's the most common form of diabetes, accounting for about 90-95% of all cases." },
      { title: "Warning Signs", icon: AlertTriangle, content: "Frequent urination (especially at night), excessive thirst, unexplained weight loss, blurred vision, slow-healing wounds, tingling or numbness in hands/feet, fatigue after meals, dark patches on skin (acanthosis nigricans), frequent infections. Many people have Type 2 for years without knowing — get tested regularly." },
      { title: "Testing Schedule", icon: Clock, content: "Check fasting blood sugar every morning before eating. Target: 4.0–7.0 mmol/L (72–126 mg/dL). Check 2 hours after meals — target: below 10.0 mmol/L (180 mg/dL). HbA1c test every 3 months — target: below 7%. Keep a log of all readings to share with your doctor." },
      { title: "Eating Rules", icon: Apple, content: "1. Eat vegetables first — fiber slows carb absorption. 2. Never eat 'naked' carbs — always pair with protein or fat. 3. Portion control is key — use the plate method (½ veg, ¼ protein, ¼ carbs). 4. Choose low-GI foods (under 55). 5. Eat at consistent times. 6. Don't skip meals — it causes sugar spikes later." },
      { title: "Foods to Avoid", icon: Ban, content: "White bread, white rice, sugary cereals, fruit juice, fizzy drinks, sweets and candy, processed meats (polony, vienna), deep-fried foods, crisps/chips, alcohol (especially beer and sweet wine). Also watch for hidden sugars in sauces, yoghurts, and 'health' bars." },
      { title: "Safe Foods", icon: ShieldCheck, content: "Leafy greens (spinach, kale), broccoli, cauliflower, green beans, eggs, chicken breast, fish (especially fatty fish like salmon), nuts (almonds, walnuts), seeds (chia, flax), avocado, berries (in moderation), plain Greek yoghurt, sweet potato (small portions), brown rice, oats." },
      { title: "Medication", icon: Pill, content: "Metformin is usually the first medication prescribed — take with food to reduce stomach upset. Never skip doses. Some people also need insulin or other medications (glimepiride, empagliflozin). Take medication at the same time daily. Don't stop taking medication even if you feel fine — diabetes is silent. Report side effects to your doctor." },
      { title: "Exercise", icon: Activity, content: "Walk for 15-30 minutes after meals — this is the single most effective thing you can do to lower post-meal sugar. Aim for 150 minutes of moderate exercise per week. Strength training 2-3 times per week improves insulin sensitivity. Check blood sugar before and after exercise. Carry a snack in case of lows." },
      { title: "Complications", icon: AlertTriangle, content: "Uncontrolled Type 2 can damage: Eyes (diabetic retinopathy — get annual eye exams), Kidneys (diabetic nephropathy — monitor protein in urine), Nerves (neuropathy — numbness, pain in feet), Heart (2-4x higher risk of heart disease), Feet (poor circulation, infections). Good control prevents or delays ALL of these." },
      { title: "The 5 Rules", icon: Activity, content: "1. Eat vegetables first — fiber slows carb absorption. 2. Move after meals — 15 min walk prevents spikes. 3. Never eat naked carbs — always pair with protein/fat. 4. Sleep 7-9 hours — poor sleep raises blood sugar. 5. Take medication consistently — don't skip even when feeling good." },
    ],
  },
  {
    id: "type1",
    title: "Type 1 Diabetes",
    icon: Syringe,
    color: "#3b82f6",
    cards: [
      { title: "What Is Type 1?", icon: BookOpen, content: "Type 1 diabetes is an autoimmune condition where your immune system destroys the insulin-producing beta cells in your pancreas. Without insulin, glucose can't enter your cells for energy. It's not caused by diet or lifestyle — it's genetic/autoimmune. Requires lifelong insulin therapy. Usually diagnosed in childhood or young adulthood." },
      { title: "Warning Signs", icon: AlertTriangle, content: "Sudden extreme thirst, frequent urination, rapid weight loss, fruity-smelling breath (DKA warning), extreme fatigue, blurred vision, bedwetting in children, mood changes, nausea/vomiting. Type 1 symptoms appear quickly (days to weeks), unlike Type 2 which develops slowly." },
      { title: "Testing Schedule", icon: Clock, content: "Check blood sugar at least 4-6 times daily: before each meal, before bed, before/after exercise, and whenever you feel 'off'. Target: 4.0-7.0 mmol/L before meals, below 9.0 mmol/L after meals. CGM (continuous glucose monitor) is ideal if available. HbA1c target: below 7%." },
      { title: "Carb Counting", icon: Apple, content: "Every meal requires calculating insulin based on carb content. Learn to read labels — total carbohydrates is your key number. Use an insulin-to-carb ratio (e.g., 1 unit per 10g carbs). Keep a food diary. GlucoLens can help you scan and count carbs automatically. Consistency in carb intake makes management easier." },
      { title: "Foods to Avoid", icon: Ban, content: "No foods are truly 'banned' with Type 1 — it's about correct insulin dosing. However, limit: sugary drinks (hard to dose accurately), large portions of white carbs, alcohol without food, high-fat meals (cause delayed spikes). Be cautious with: pizza, Chinese takeaway, pasta — these cause unpredictable prolonged spikes." },
      { title: "Safe Foods", icon: ShieldCheck, content: "Protein-rich foods (chicken, fish, eggs, tofu), non-starchy vegetables (unlimited), healthy fats (avocado, nuts, olive oil), berries, Greek yoghurt. These have minimal impact on blood sugar. For carbs, choose whole grains, sweet potato, legumes — they're easier to dose for than refined carbs." },
      { title: "Insulin Management", icon: Pill, content: "Basal insulin (long-acting): provides background coverage 24/7. Bolus insulin (rapid-acting): taken before meals to cover carbs. Correction dose: extra insulin to bring down a high reading. Never skip basal insulin. Rotate injection sites. Store insulin properly (not in direct sunlight or freezing). Carry emergency glucagon." },
      { title: "Hypo Management", icon: Droplets, content: "Hypoglycemia (below 4.0 mmol/L) is dangerous. Symptoms: shaking, sweating, confusion, rapid heartbeat, dizziness. Treatment: Rule of 15 — eat 15g fast carbs (glucose tablets, juice), wait 15 minutes, re-test. If still low, repeat. Always carry glucose tablets. Teach friends/family how to use glucagon for severe hypos." },
      { title: "DKA Prevention", icon: AlertTriangle, content: "Diabetic Ketoacidosis (DKA) is a life-threatening emergency. Causes: missed insulin doses, illness, pump failure. Signs: blood sugar above 14 mmol/L, ketones in urine/blood, nausea, vomiting, fruity breath, confusion. Action: take correction insulin, check ketones, drink water. Go to ER if ketones are high or you're vomiting." },
      { title: "The 5 Rules", icon: Activity, content: "1. Never skip insulin — especially basal. 2. Always carry glucose — hypos can happen anytime. 3. Count your carbs — accurate dosing prevents spikes. 4. Check before driving — never drive below 5.0. 5. Sick day rules — check blood sugar and ketones every 2-4 hours when ill." },
    ],
  },
  {
    id: "prediabetes",
    title: "Pre-Diabetes",
    icon: AlertTriangle,
    color: "#f59e0b",
    cards: [
      { title: "What Is Pre-Diabetes?", icon: BookOpen, content: "Pre-diabetes means your blood sugar is higher than normal but not yet high enough for a Type 2 diagnosis. HbA1c between 5.7-6.4% or fasting glucose 5.6-6.9 mmol/L. About 70% of people with pre-diabetes eventually develop Type 2 — but it's REVERSIBLE with lifestyle changes. This is your window of opportunity." },
      { title: "Am I At Risk?", icon: AlertTriangle, content: "Risk factors: overweight (especially belly fat), age over 45, family history of diabetes, sedentary lifestyle, history of gestational diabetes, polycystic ovary syndrome (PCOS), high blood pressure, abnormal cholesterol. South African Black, Coloured, and Indian populations have higher genetic risk." },
      { title: "Testing Schedule", icon: Clock, content: "Get HbA1c tested every 6 months. Optional: check fasting blood sugar monthly with a home glucometer. Track your weight weekly. Monitor waist circumference monthly (target: under 94cm men, under 80cm women). Blood pressure check every 3 months." },
      { title: "Eating for Reversal", icon: Apple, content: "1. Cut refined carbs by 50% — replace white bread/rice with whole grain. 2. Fill half your plate with vegetables at every meal. 3. Eat protein with every meal and snack. 4. Choose low-GI foods. 5. Reduce portion sizes by 25%. 6. Stop drinking fruit juice and fizzy drinks entirely. 7. Limit alcohol. These changes alone can reverse pre-diabetes." },
      { title: "Foods to Avoid", icon: Ban, content: "White bread, white rice, white pasta, sugary breakfast cereals, fruit juice, cool drinks, sweets, crisps, deep-fried foods, processed meats, excessive alcohol, sweetened yoghurt, energy drinks, flavoured coffees. Cut these and you're halfway to reversing pre-diabetes." },
      { title: "Safe Foods", icon: ShieldCheck, content: "All non-starchy vegetables, eggs, fish, chicken, lean meat, legumes (lentils, chickpeas, beans), nuts and seeds, avocado, berries, plain yoghurt, oats, sweet potato (moderate), brown rice (moderate), olive oil. These foods help improve insulin sensitivity and stabilize blood sugar." },
      { title: "Exercise Plan", icon: Activity, content: "The single most effective intervention for pre-diabetes. Target: 150 minutes/week of moderate exercise (brisk walking counts). Add strength training 2x/week. Walk after every meal for 15 minutes. Take stairs instead of lifts. Park further away. Stand up every 30 minutes if you sit for work. Even small increases in activity help." },
      { title: "Weight Loss Target", icon: Activity, content: "Losing just 5-7% of body weight can prevent progression to Type 2. For an 80kg person, that's only 4-5.6kg. Focus on slow, sustainable loss (0.5-1kg per week). Don't crash diet — it backfires. Combine reduced portions with increased activity. Track your progress weekly." },
      { title: "Supplements", icon: Pill, content: "Berberine — shown to lower blood sugar similar to metformin. Chromium — supports glucose metabolism. Magnesium — many people with pre-diabetes are deficient. Vitamin D — low levels linked to insulin resistance. Cinnamon — may improve insulin sensitivity. Alpha-lipoic acid — antioxidant that supports glucose uptake. Always consult your doctor first." },
      { title: "The 5 Rules", icon: Activity, content: "1. Move after every meal — 15 min walk. 2. Cut sugary drinks completely — water, tea, black coffee only. 3. Eat protein at every meal — it stabilizes blood sugar. 4. Sleep 7-9 hours — poor sleep worsens insulin resistance. 5. Weigh yourself weekly — accountability prevents slip-ups." },
    ],
  },
  {
    id: "healthy",
    title: "Healthy Lifestyle",
    icon: Leaf,
    color: "#22c55e",
    cards: [
      { title: "Why Prevention Matters", icon: BookOpen, content: "Even without diabetes, smart eating and exercise protect your metabolic health. Stable blood sugar = steady energy, better mood, clearer thinking, and lower disease risk. Prevention is easier than managing diabetes. The habits you build now protect you for decades." },
      { title: "Optimal Blood Sugar", icon: Droplets, content: "Normal fasting blood sugar: 3.9-5.5 mmol/L. After meals: below 7.8 mmol/L. HbA1c below 5.7%. Even within 'normal' range, lower is generally better for long-term health. Blood sugar spikes cause inflammation, weight gain, and energy crashes — even if you're not diabetic." },
      { title: "Eating for Energy", icon: Apple, content: "Eat whole, unprocessed foods. Combine protein + fat + fiber at every meal to prevent sugar spikes. Eat your vegetables and protein before carbs. Don't skip breakfast. Avoid eating large meals late at night. Stay hydrated — dehydration raises blood sugar. Limit added sugar to under 25g/day." },
      { title: "Foods to Enjoy", icon: ShieldCheck, content: "Leafy greens, cruciferous vegetables, berries, fatty fish, eggs, nuts and seeds, olive oil, avocado, legumes, sweet potato, whole grains, fermented foods (yoghurt, sauerkraut), herbs and spices (turmeric, cinnamon, ginger). These support metabolic health and reduce inflammation." },
      { title: "Foods to Limit", icon: Ban, content: "Ultra-processed foods, refined sugar, white flour products, seed oils (sunflower, canola in excess), sugary drinks, alcohol, artificial sweeteners (they still trigger insulin), processed meats, deep-fried foods. The 80/20 rule: eat well 80% of the time, enjoy treats 20%." },
      { title: "Exercise Routine", icon: Activity, content: "Ideal: 150 min moderate cardio + 2-3 strength sessions per week. Walking after meals is powerful for blood sugar. Mix it up: walking, swimming, cycling, resistance training. Don't sit for more than 30 minutes at a time. Morning exercise improves insulin sensitivity for the entire day." },
      { title: "Sleep & Stress", icon: Clock, content: "Sleep 7-9 hours per night. Poor sleep raises cortisol, which raises blood sugar. Stick to a consistent sleep schedule. Manage stress — high cortisol = high blood sugar. Try: walking, deep breathing, meditation, time in nature. Limit screen time before bed." },
      { title: "Key Supplements", icon: Pill, content: "Magnesium — most people are deficient, supports 300+ enzyme reactions. Omega-3 — reduces inflammation. Vitamin D — essential for immune and metabolic health. Probiotics — gut health affects blood sugar. Chromium — supports glucose metabolism. Always get bloodwork first to identify actual deficiencies." },
      { title: "Anti-inflammatory Foods", icon: Leaf, content: "Chronic inflammation drives metabolic disease. Top anti-inflammatory foods: turmeric (with black pepper), fatty fish, blueberries, leafy greens, walnuts, olive oil, green tea, dark chocolate (70%+), ginger, garlic. Eat a rainbow of colors — different antioxidants in different colors." },
      { title: "The 5 Rules", icon: Activity, content: "1. Eat whole foods — not processed. 2. Move daily — 30 min walks count. 3. Manage stress — high stress raises blood sugar. 4. Sleep well — 7-9 hours improves metabolism. 5. Regular checkups — catch issues early." },
    ],
  },
];

// ─── Components ─────────────────────────────────────────────────────────────

function CategoryCard({ category, active, onPress }: { category: GuideCategory; active: boolean; onPress: () => void }) {
  const Icon = category.icon;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: active ? `${category.color}20` : colors.card,
        borderRadius: radius.lg,
        padding: 12,
        alignItems: "center",
        gap: 6,
        borderWidth: 1,
        borderColor: active ? `${category.color}60` : colors.border,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Icon size={20} color={active ? category.color : colors.textSecondary} strokeWidth={2} />
      <Text style={{ fontSize: 10, fontWeight: "600", color: active ? category.color : colors.textSecondary, textAlign: "center" }} numberOfLines={2}>
        {category.title}
      </Text>
    </Pressable>
  );
}

function ContentCard({ card, expanded, onToggle, accentColor }: {
  card: { title: string; icon: any; content: string };
  expanded: boolean;
  onToggle: () => void;
  accentColor: string;
}) {
  const Icon = card.icon;
  return (
    <Pressable onPress={onToggle} style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.border }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          <Icon size={18} color={accentColor} strokeWidth={2} />
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary, flex: 1 }}>{card.title}</Text>
        </View>
        {expanded ? <ChevronUp size={18} color={colors.textSecondary} /> : <ChevronDown size={18} color={colors.textSecondary} />}
      </View>
      {expanded && (
        <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginTop: 12, paddingLeft: 28 }}>{card.content}</Text>
      )}
    </Pressable>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function GlucoseGuideScreen() {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState("type2");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const currentCategory = GUIDE_DATA.find((c) => c.id === activeCategory)!;

  const toggleCard = (cardTitle: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardTitle)) next.delete(cardTitle);
      else next.add(cardTitle);
      return next;
    });
  };

  const switchCategory = (id: string) => {
    setActiveCategory(id);
    setExpandedCards(new Set());
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 16 }}>
          <Text style={{ fontSize: 11, fontWeight: "600", color: colors.primary, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>Glucose Guide</Text>
          <Text style={{ fontSize: 24, fontWeight: "800", color: colors.textPrimary }}>Learn & Understand</Text>
        </View>

        {/* Category Selector */}
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 20, marginBottom: 20 }}>
          {GUIDE_DATA.map((cat) => (
            <CategoryCard key={cat.id} category={cat} active={activeCategory === cat.id} onPress={() => switchCategory(cat.id)} />
          ))}
        </View>

        {/* Content Cards */}
        <View style={{ paddingHorizontal: 20 }}>
          {currentCategory.cards.map((card) => (
            <ContentCard
              key={card.title}
              card={card}
              expanded={expandedCards.has(card.title)}
              onToggle={() => toggleCard(card.title)}
              accentColor={currentCategory.color}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
