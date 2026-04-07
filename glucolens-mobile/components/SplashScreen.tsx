import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import Svg, { Circle, Path, Defs, Pattern, Rect } from "react-native-svg";
import { useEffect, useRef } from "react";

const TEAL = "#3DA39B";
const CYAN = "#14b8a6";
const WIDTH = Dimensions.get("window").width;
const HEIGHT = Dimensions.get("window").height;

interface Props {
  onFinish?: () => void;
}

export function SplashScreen({ onFinish }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in and scale content over 1s
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Bounce animation: loop up/down 10px
    const bounceSequence = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -10,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 10,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    bounceSequence.start();

    // Progress bar fills over 3s
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start();

    // Call onFinish after 3s
    const timer = setTimeout(() => {
      onFinish?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, bounceAnim, progressAnim, onFinish]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "80%"],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={TEAL} />

      {/* Honeycomb pattern SVG background */}
      <View style={StyleSheet.absoluteFill}>
        <Svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
          <Defs>
            <Pattern
              id="honeycomb"
              patternUnits="userSpaceOnUse"
              width="60"
              height="60"
            >
              {/* Hexagonal honeycomb pattern */}
              <Path
                d="M30,0 L60,15 L60,45 L30,60 L0,45 L0,15 Z"
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1"
              />
            </Pattern>
          </Defs>
          <Rect width={WIDTH} height={HEIGHT} fill={TEAL} />
          <Rect width={WIDTH} height={HEIGHT} fill="url(#honeycomb)" />
        </Svg>
      </View>

      {/* Content */}
      <Animated.View
        style={{
          ...styles.content,
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
      >
        {/* Eye Logo with bounce */}
        <Animated.View
          style={{
            transform: [{ translateY: bounceAnim }],
          }}
        >
          <Svg width={80} height={80} viewBox="0 0 40 40">
            {/* Eye-like lens logo */}
            <Circle
              cx="20"
              cy="20"
              r="19"
              fill="rgba(255,255,255,0.1)"
              stroke="white"
              strokeWidth="2"
            />
            <Circle
              cx="20"
              cy="20"
              r="13.5"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              strokeOpacity="0.6"
            />
            <Circle cx="20" cy="20" r="9.5" fill="white" />
            <Circle cx="20" cy="20" r="5.5" fill={CYAN} />
            <Circle cx="20" cy="20" r="2.5" fill={TEAL} />
          </Svg>
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>GlucoLens</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>SMART GLUCOSE MONITORING</Text>
      </Animated.View>

      {/* Progress bar at bottom */}
      <View style={styles.progressBarContainer}>
        {/* Track */}
        <View style={styles.progressTrack}>
          {/* Fill */}
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressWidth,
              },
            ]}
          >
            {/* Glow/diamond tip at end */}
            <View
              style={{
                position: "absolute",
                right: -6,
                top: -2,
                width: 14,
                height: 14,
                backgroundColor: CYAN,
                transform: [{ rotate: "45deg" }],
                borderRadius: 1,
                shadowColor: CYAN,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 8,
                elevation: 5,
              }}
            />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    gap: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: "900",
    color: "white",
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  progressBarContainer: {
    position: "absolute",
    bottom: 60,
    width: "80%",
    alignItems: "center",
  },
  progressTrack: {
    width: "100%",
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  progressFill: {
    height: "100%",
    backgroundColor: CYAN,
    borderRadius: 3,
  },
});
