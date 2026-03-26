import { View, Text, StyleSheet } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>GlucoLens</Text>
      <Text style={styles.subtitle}>Diabetes Management App</Text>
      <Text style={styles.version}>v1.0.0 - Build Test</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0d9488" },
  title: { fontSize: 36, fontWeight: "bold", color: "#fff" },
  subtitle: { fontSize: 18, color: "#e0f2f1", marginTop: 8 },
  version: { fontSize: 14, color: "#b2dfdb", marginTop: 24 },
});
