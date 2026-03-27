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
      quality: 0.8,
      base64: true,
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
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setPreview(result.assets[0].uri);
      onAnalyse(result.assets[0].base64);
    }
  };

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 24, alignItems: "center" }}>
      <View style={{
        width: "100%",
        height: 260,
        borderRadius: radius.xl,
        backgroundColor: colors.card,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: colors.border,
        borderStyle: "dashed",
        overflow: "hidden",
        ...shadow.card,
      }}>
        {preview ? (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Check size={18} color={colors.primary} />
              <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "600" }}>Image selected</Text>
            </View>
          </View>
        ) : (
          <View style={{ alignItems: "center", gap: 12 }}>
            <View style={{
              width: 64, height: 64, borderRadius: 20,
              backgroundColor: colors.primaryLight,
              alignItems: "center", justifyContent: "center",
            }}>
              <CameraIcon size={28} color={colors.primary} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.textPrimary }}>
              Point at your meal
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: "center", lineHeight: 18 }}>
              Take a photo or upload from your gallery
            </Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: "row", gap: 12, marginTop: 16, width: "100%" }}>
        <Pressable
          onPress={takePhoto}
          disabled={loading}
          style={({ pressed }) => ({
            flex: 1, height: 50, borderRadius: radius.lg,
            backgroundColor: colors.primary,
            alignItems: "center", justifyContent: "center",
            flexDirection: "row", gap: 8,
            opacity: pressed || loading ? 0.7 : 1,
            ...shadow.button,
          })}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <CameraIcon size={16} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Camera</Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={pickImage}
          disabled={loading}
          style={({ pressed }) => ({
            flex: 1, height: 50, borderRadius: radius.lg,
            backgroundColor: colors.card,
            alignItems: "center", justifyContent: "center",
            flexDirection: "row", gap: 8,
            borderWidth: 1.5, borderColor: colors.primary,
            opacity: pressed || loading ? 0.7 : 1,
          })}
        >
          <ImageIcon size={16} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 14 }}>Gallery</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Barcode panel ───────────────────────────────────────────────────────────

function BarcodePanel({ onAnalyse, loading }: { onAnalyse: (barcode: string) => void; loading: boolean }) {
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;
  }

  if (!permission.granted) {
    return (
      <View style={{ paddingHorizontal: 20, paddingTop: 40, alignItems: "center", gap: 16 }}>
        <AlertCircle size={40} color={colors.primary} />
        <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textPrimary, textAlign: "center" }}>
          Camera permission needed
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center" }}>
          Allow camera access to scan barcodes on food packaging.
        </Text>
        <Pressable
          onPress={requestPermission}
          style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Allow Camera</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
      <View style={{ borderRadius: radius.xl, overflow: "hidden", height: 320 }}>
        {!scanned && !loading ? (
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "qr"] }}
            onBarcodeScanned={({ data }) => {
              if (scanned || loading) return;
              setScanned(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onAnalyse(data);
            }}
          />
        ) : (
          <View style={{
            flex: 1, backgroundColor: colors.card,
            alignItems: "center", justifyContent: "center", gap: 12,
          }}>
            {loading ? (
              <>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Looking up product</Text>
              </>
            ) : (
              <>
                <Check size={40} color={colors.primary} />
                <Text style={{ color: colors.textPrimary, fontWeight: "700", fontSize: 15 }}>Barcode scanned</Text>
                <Pressable
                  onPress={() => setScanned(false)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}
                >
                  <RefreshCw size={14} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: "600" }}>Scan another</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>

      {!scanned && !loading && (
        <View style={{ alignItems: "center", marginTop: 12 }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: "center" }}>
            Align the barcode within the frame.{"\n"}Supports EAN-13, UPC-A, and more.
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Text panel ──────────────────────────────────────────────────────────────

function TextPanel({ onAnalyse, loading }: { onAnalyse: (text: string) => void; loading: boolean }) {
  const [input, setInput] = useState("");
  const examples = [
    "2 slices of whole wheat toast with peanut butter",
    "Large bowl of pasta with tomato sauce",
    "Grilled chicken salad with avocado",
  ];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 }}>
          Describe your meal
        </Text>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="e.g. 2 scrambled eggs with toast and orange juice"
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={5}
          style={{
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            padding: 14,
            fontSize: 15,
            color: colors.textPrimary,
            borderWidth: 1.5,
            borderColor: input.length > 0 ? colors.primary : colors.border,
            minHeight: 120,
            textAlignVertical: "top",
          }}
        />

        <Pressable
          onPress={() => input.trim().length > 2 && onAnalyse(input.trim())}
          disabled={loading || input.trim().length < 3}
          style={({ pressed }) => ({
            marginTop: 14, height: 52, borderRadius: radius.lg,
            backgroundColor: input.trim().length > 2 ? colors.primary : colors.border,
            alignItems: "center", justifyContent: "center",
            flexDirection: "row", gap: 8,
            opacity: pressed ? 0.85 : 1,
            ...(input.trim().length > 2 && shadow.button),
          })}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Send size={16} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Analyse Meal</Text>
            </>
          )}
        </Pressable>

        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 20, marginBottom: 8, fontWeight: "600" }}>
          Try an example:
        </Text>
        {examples.map((ex) => (
          <Pressable
            key={ex}
            onPress={() => setInput(ex)}
            style={({ pressed }) => ({
              backgroundColor: colors.card,
              borderRadius: radius.md,
              padding: 10, marginBottom: 8,
              borderWidth: 1, borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 13, color: colors.textPrimary }}>{ex}</Text>
          </Pressable>
        ))}
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Loading overlay ─────────────────────────────────────────────────────────

function AnalysingOverlay() {
  const messages = [
    "Identifying foods",
    "Calculating glycaemic index",
    "Estimating blood sugar impact",
    "Almost there",
  ];
  const [idx] = useState(Math.floor(Math.random() * messages.length));
  return (
    <View style={{
      position: "absolute",
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.65)",
      alignItems: "center", justifyContent: "center",
      zIndex: 99,
    }}>
      <View style={{
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        padding: 32, alignItems: "center", gap: 16, width: 260,
        borderWidth: 1.5,
        borderColor: colors.border,
      }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textPrimary, textAlign: "center" }}>
          Analysing your meal
        </Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: "center" }}>
          {messages[idx]}
        </Text>
      </View>
    </View>
  );
}

// ─── Root screen ─────────────────────────────────────────────────────────────

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("camera");
  const [loading, setLoading] = useState(false);
  const setResult = useAnalysisStore((s) => s.setResult);
  const profile = useProfileStore((s) => s.profile);

  const analyseFoodMutation = trpc.food.analyze.useMutation();
  const analyseTextMutation = trpc.food.analyzeText.useMutation();
  const barcodeAnalyseMutation = trpc.food.analyzeBarcode.useMutation();

  const handlePhotoAnalyse = async (base64: string) => {
    setLoading(true);
    try {
      const raw = await analyseFoodMutation.mutateAsync({ imageBase64: base64 });
      setResult(normaliseResult(raw) as any);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push("/results");
    } catch (e: any) {
      Alert.alert("Analysis failed", e.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTextAnalyse = async (text: string) => {
    setLoading(true);
    try {
      const raw = await analyseTextMutation.mutateAsync({ description: text });
      setResult(normaliseResult(raw) as any);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push("/results");
    } catch (e: any) {
      Alert.alert("Analysis failed", e.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeAnalyse = async (barcode: string) => {
    setLoading(true);
    try {
      const raw = await barcodeAnalyseMutation.mutateAsync({ barcode });
      setResult(normaliseResult(raw) as any);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push("/results");
    } catch (e: any) {
      Alert.alert("Product not found", e.message ?? "Try a different product or use text mode.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {loading && <AnalysingOverlay />}

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 20 }}>
          <Text style={{ fontSize: 26, fontWeight: "800", color: colors.textPrimary }}>
            Scan Meal
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
            Analyse any food for blood sugar impact
          </Text>
        </View>

        <SegmentedControl mode={mode} onChange={setMode} />

        {mode === "camera"  && <PhotoPanel   onAnalyse={handlePhotoAnalyse}   loading={loading} />}
        {mode === "barcode" && <BarcodePanel onAnalyse={handleBarcodeAnalyse} loading={loading} />}
        {mode === "text"    && <TextPanel    onAnalyse={handleTextAnalyse}     loading={loading} />}
      </ScrollView>
    </View>
  );
}
