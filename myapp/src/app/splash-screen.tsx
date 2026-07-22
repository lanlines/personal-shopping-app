import { useEffect } from "react";
import { Text, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { getDatabaseAsync } from "../db/database";

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let isActive = true;

    async function initializeApp() {
      try {
        await getDatabaseAsync();

        if (!isActive) {
          return;
        }

        timer = setTimeout(() => {
          router.replace("/home-screen");
        }, 2000);
      } catch {
        if (isActive) {
          router.replace("/home-screen");
        }
      }
    }

    initializeApp();

    return () => {
      isActive = false;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <Text>Splash Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});