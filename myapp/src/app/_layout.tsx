import { useEffect } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getDatabaseAsync } from "../db/database";

export default function RootLayout() {
  useEffect(() => {
    getDatabaseAsync().catch(console.error);
  }, []);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}