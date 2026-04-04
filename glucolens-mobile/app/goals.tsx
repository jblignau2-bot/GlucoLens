/**
 * Personal Goals — Progress Photos (weeks 1–4)
 *
 * Take front / side / back photos each week to visually track
 * your health journey. Photos are stored per user in Supabase.
 */

import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { trpc } from "@/lib/trpc";
import { colors, radius, shadow } from "@/constants/tokens";
import {
  ArrowLeft,
  Camera,
  User,
  ChevronRight,
  Trash2,
  Trophy,
  Target,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

const WEEKS = [1, 2, 3, 4] as const;
const ANGLES = ["front", "side", "back"] as const;
const ANGLE_LABELS: Record<string, string> = {
  front: "Front",
  side: "Side",
  back: "Back",
};

const screenW = Dimensions.get("window").width;
const photoSize = (screenW - 40 - 16) / 3; // 3 columns with gaps

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeWeek, setActiveWeek] = useState(1);
  const [uploading, setUploading] = useState<string | null>(null);

  const { data: photos, refetch, isLoading } = trpc.goals.listPhotos.useQuery();

  const saveMutation = trpc.goals.savePhoto.useMutation({
    onSuccess: () => {
      refetch();
      setUploading(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e) => {
      setUploading(null);
      Alert.alert("Upload failed", e.message);
    },
  });

  const deleteMutation = trpc.goals.deletePhoto.useMutation({
    onSuccess: () => {
      refetch();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const getPhoto = (week: number, angle: string) =>
    (photos ?? []).find((p: any) => p.week === week && p.angle === angle);

  const weekProgress = (week: number) => {
    const count = ANGLES.filter((a) => getPhoto(week, a)).length;
    return count;
  };

  const handlePickPhoto = async (week: number, angle: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setUploading(`${week}-${angle}`);
      saveMutation.mutate({
        week,
        angle: angle as any,
        photoBase64: result.assets[0].base64,
      });
    }
  };

  const handleTakePhoto = async (week: number, angle: string) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.6,
      base64: true,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setUploading(`${week}-${angle}`);
      saveMutation.mutate({
        week,
        angle: angle as any,
        photoBase64: result.assets[0].base64,
      });
    }
  };

  const handlePhotoAction = (week: number, angle: string) => {
    const existing = getPhoto(week, angle);
    const options: any[] = [
      { text: "Take Photo", onPress: () => handleTakePhoto(week, angle) },
      { text: "Choose from Gallery", onPress: () => handlePickPhoto(week, angle) },
    ];
    if (existing) {
      options.push({
        text: "Delete Photo",
        style: "destructive",
        onPress: () => deleteMutation.mutate({ id: existing.id }),
      });
    }
    options.push({ text: "Cancel", style: "cancel" });
    Alert.alert(
      `${ANGLE_LABELS[angle]} — Week ${week}`,
      existing ? "Replace or delete this photo" : "Add a progress photo",
      options
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        paddingTop: insets.top + 12,
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: colors.primary,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: "rgba(255,255,255,0.2)",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <ArrowLeft size={18} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#fff" }}>
              My Progress
            </Text>
            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
              Track your body transformation over 4 weeks
            </Text>
          </View>
          <Trophy size={24} color="rgba(255,255,255,0.7)" />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Week selector */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
          {WEEKS.map((w) => {
            const active = activeWeek === w;
            const progress = weekProgress(w);
            return (
              <Pressable
                key={w}
                onPress={() => setActiveWeek(w)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: radius.lg,
                  backgroundColor: active ? colors.primary : colors.card,
                  alignItems: "center",
                  borderWidth: 1.5,
                  borderColor: active ? colors.primary : colors.border,
                  ...shadow.card,
                }}
              >
                <Text style={{
                  fontSize: 13, fontWeight: "800",
                  color: active ? "#fff" : colors.textPrimary,
                }}>
                  Week {w}
                </Text>
                <Text style={{
                  fontSize: 11, marginTop: 2,
                  color: active ? "rgba(255,255,255,0.8)" : colors.textSecondary,
                }}>
                  {progress}/3 photos
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Progress hint */}
        <View style={{
          backgroundColor: colors.primaryLight,
          borderRadius: radius.lg,
          padding: 14,
          marginBottom: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}>
          <Target size={18} color={colors.primary} />
          <Text style={{ flex: 1, fontSize: 13, color: colors.primary, lineHeight: 18 }}>
            Take a front, side, and back photo each week to see your progress. Consistency is key — same lighting and pose works best.
          </Text>
        </View>

        {/* Photo grid for active week */}
        <Text style={{
          fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginBottom: 12,
        }}>
          Week {activeWeek} Photos
        </Text>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={{ flexDirection: "row", gap: 8 }}>
            {ANGLES.map((angle) => {
              const photo = getPhoto(activeWeek, angle);
              const isUploading = uploading === `${activeWeek}-${angle}`;

              return (
                <Pressable
                  key={angle}
                  onPress={() => handlePhotoAction(activeWeek, angle)}
                  style={{
                    width: photoSize,
                    height: photoSize * 1.33,
                    borderRadius: radius.lg,
                    backgroundColor: colors.card,
                    borderWidth: 1.5,
                    borderColor: photo ? colors.primary : colors.border,
                    borderStyle: photo ? "solid" : "dashed",
                    overflow: "hidden",
                    alignItems: "center",
                    justifyContent: "center",
                    ...shadow.card,
                  }}
                >
                  {isUploading ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : photo ? (
                    <Image
                      source={{ uri: `data:image/jpeg;base64,${photo.photoBase64}` }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{ alignItems: "center", gap: 6 }}>
                      <Camera size={24} color={colors.border} />
                      <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: "600" }}>
                        {ANGLE_LABELS[angle]}
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.textSecondary }}>
                        Tap to add
                      </Text>
                    </View>
                  )}

                  {/* Angle label overlay */}
                  {photo && (
                    <View style={{
                      position: "absolute", bottom: 0, left: 0, right: 0,
                      backgroundColor: "rgba(0,0,0,0.5)",
                      paddingVertical: 4,
                      alignItems: "center",
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>
                        {ANGLE_LABELS[angle]}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Week-by-week comparison */}
        <Text style={{
          fontSize: 15, fontWeight: "700", color: colors.textPrimary,
          marginTop: 28, marginBottom: 12,
        }}>
          Weekly Comparison
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 12, lineHeight: 17 }}>
          Your front-view photos side by side — watch the progress build up over time.
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {WEEKS.map((w) => {
              const frontPhoto = getPhoto(w, "front");
              const size = (screenW - 60) / 4;
              return (
                <View key={w} style={{ alignItems: "center", gap: 4 }}>
                  <View style={{
                    width: size, height: size * 1.33,
                    borderRadius: radius.md,
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: frontPhoto ? colors.primary : colors.border,
                    overflow: "hidden",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    {frontPhoto ? (
                      <Image
                        source={{ uri: `data:image/jpeg;base64,${frontPhoto.photoBase64}` }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    ) : (
                      <User size={20} color={colors.border} />
                    )}
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textSecondary }}>
                    Wk {w}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}
