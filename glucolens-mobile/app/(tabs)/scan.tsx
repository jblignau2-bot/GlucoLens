/**
 * Scan screen
 *
 * Three modes selectable via segmented control:
 *   1. Camera  — live capture / pick from gallery
 *   2. Barcode — scan product barcode → Open Food Facts lookup
 *   3. Text    — type / paste a meal description
 *
 * On successful analysis the result is written to analysisStore,
 * then the user is pushed to /results.
 */

import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import { trpc } from "@/lib/trpc";
import { useAnalysisStore } from "@/stores/analysisStore";
import { useProfileStore } from "@/stores/profileStore";
import { colors, radius, shadow } from "@/constants/tokens";
import {
  Camera as CameraIcon,
  Barcode,
  Type,
  Image as ImageIcon,
  Send,
  RefreshCw,
  AlertCircle,
  Check,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

type Mode = "camera" | "barcode" | "text";

/**
 * Normalise an AI analysis response into the flat shape that results.tsx
 * and the dashboard openMeal() helper both expect.
 *
 * The backend returns the nested OpenAI format:
 *   { nutrition: { calories, totalSugar_g, ... }, diabetesRating: { type1: { rating, reason }, ... } }
 *
 * results.tsx reads the flat format:
 *   { calories, totalSugar, totalCarbs, ratingType1, reasonType1, ... }
 *
 * This function handles BOTH formats so it's safe to call on already-flat data.
 */
function normaliseResult(raw: any) {
  // Already flat (e.g. from dashboard openMeal)
  if (raw.calories !== undefined && raw.ratingType1 !== undefined) return raw;

  const n = raw.nutrition ?? {};
  const dr = raw.diabetesRating ?? {};
  return {
    mealName: raw.mealName ?? "Unknown Meal",
    identifiedFoods: raw.identifiedFoods ?? [],
    imageUri: raw.imageUri,
    imageUrl: raw.imageUrl,
    itemBreakdown: raw.itemBreakdown ?? [],
    // Flattened nutrition
    calories: n.calories ?? raw.calories ?? 0,
    totalSugar: n.totalSugar_g ?? n.totalSugar ?? raw.totalSugar ?? 0,
    totalCarbs: n.totalCarbs_g ?? n.totalCarbs ?? raw.totalCarbs ?? 0,
    glycemicIndex: n.glycemicIndex ?? raw.glycemicIndex ?? 0,
    glycemicLoad: n.glycemicLoad ?? raw.glycemicLoad ?? 0,
    protein: n.protein_g ?? n.protein ?? raw.protein ?? 0,
    fat: n.fat_g ?? n.fat ?? raw.fat ?? 0,
    fiber: n.fiber_g ?? n.fiber ?? raw.fiber ?? 0,
    // Flattened ratings
    ratingType1: dr.type1?.rating ?? raw.ratingType1 ?? "moderate",
    ratingType2: dr.type2?.rating ?? raw.ratingType2 ?? "moderate",
    reasonType1: dr.type1?.reason ?? raw.reasonType1 ?? "",
    reasonType2: dr.type2?.reason ?? raw.reasonType2 ?? "",
    // Pass-through arrays
    whyRisky: raw.whyRisky ?? [],
    healthierAlternatives: raw.healthierAlternatives ?? [],
    foodsToAvoid: raw.foodsToAvoid ?? [],
  };
}

// ─── Segmented control ───────────────────────────────────────────────────────

function SegmentedControl({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const tabs: { key: Mode; label: string; Icon: any }[] = [
    { key: "camera", label: "Photo", Icon: CameraIcon },
    { key: "barcode", label: "Barcode", Icon: Barcode },
    { key: "text", label: "Text", Icon: Type },
  ];

  return (
    <View style={{
      flexDirection: "row",
      gap: 8,
      marginHorizontal: 20,
      justifyContent: "center",
    }}>
      {tabs.map(({ key, label, Icon }) => {
        const active = mode === key;
        return (
          <Pressable
            key={key}
            onPress={() => { Haptics.selectionAsync(); onChange(key); }}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              paddingVertical: 11,
              paddingHorizontal: 12,
              borderRadius: radius.lg,
              backgroundColor: active ? colors.card : colors.glass,
              borderWidth: 1.5,
              borderColor: active ? colors.primary : colors.border,
              opacity: pressed ? 0.8 : 1,
              ...(active && {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 8,
                elevation: 4,
              }),
            })}
          >
            <Icon size={16} color={active ? colors.primary : colors.textSecondary} />
            <Text style={{
              fontSize: 13,
              fontWeight: "700",
              color: active ? colors.textPrimary : colors.textSecondary,
            }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Camera / Photo panel ────────────────────────────────────────────────────

function PhotoPanel({ onAnalyse, loading }: { onAnalyse: (base64: string) => void; loading: boolean }) {
  const [preview, setPreview] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
      maxWidth: 1024,
      maxHeight: 1024,
    });
    if (!result.canceled && result.assets[0].base64) {
      setPreview(result.assets[0].uri);
      onAnalyse(result.assets[0].base64);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.5,
      base64: true,
      maxWidth: 1024,
      maxHeight: 1024,
    });
    if (!result.canceled && result.assets[0].base64) {
      setPreview(result.assets[0].uri);
      onAnalyse(result.assets[0].base64);
    }
  };
