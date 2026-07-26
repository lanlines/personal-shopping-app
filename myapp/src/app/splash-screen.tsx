import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { getDatabaseAsync } from "../db/database";

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    let isActive = true;

    async function init() {
      try {
        await getDatabaseAsync();
      } catch {
        // DB init failed — proceed anyway, screens will handle errors
      }

      if (!isActive) return;

      setTimeout(() => {
        if (isActive) router.replace("/home-screen");
      }, 1200);
    }

    init();

    return () => {
      isActive = false;
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.logoBlock}>
        <Text style={styles.logo}>🛒</Text>
        <Text style={styles.appName}>Shopping App</Text>
        <Text style={styles.tagline}>Track every peso, every trip.</Text>
      </View>
      <Text style={styles.loading}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  logoBlock: {
    alignItems: "center",
    gap: 12,
  },
  logo: {
    fontSize: 64,
  },
  appName: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: "#6B6B63",
    fontWeight: "500",
  },
  loading: {
    position: "absolute",
    bottom: 52,
    fontSize: 13,
    color: "#4A4A42",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
