import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { useFonts } from "expo-font";
import { Asset } from "expo-asset";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const preloadAssets = [
  require("../assets/images/icon.png"),
  require("../assets/images/logo-glow.png"),
];

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "SpaceGrotesk-Regular": SpaceGrotesk_400Regular,
    "SpaceGrotesk-Medium": SpaceGrotesk_500Medium,
    "SpaceGrotesk-Bold": SpaceGrotesk_700Bold,
  });

  const assetsPromise = useMemo(() => Asset.loadAsync(preloadAssets), []);

  useEffect(() => {
    let active = true;

    Promise.all([assetsPromise]).finally(() => {
      if (active && fontsLoaded) {
        SplashScreen.hideAsync().catch(() => undefined);
      }
    });

    return () => {
      active = false;
    };
  }, [assetsPromise, fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="agent" />
        <Stack.Screen name="member" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}
