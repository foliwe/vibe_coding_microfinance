import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { useFonts } from "expo-font";
import { Asset } from "expo-asset";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";

import { AppSessionProvider } from "@/lib/app-session";
import "@/global.css";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const preloadAssets = [
  require("../assets/images/icon.png"),
  require("../assets/images/logo-glow.png"),
  require("../assets/images/unity-credit-logo.png"),
];

export default function RootLayout() {
  const [fontFallbackReady, setFontFallbackReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    "SpaceGrotesk-Regular": SpaceGrotesk_400Regular,
    "SpaceGrotesk-Medium": SpaceGrotesk_500Medium,
    "SpaceGrotesk-Bold": SpaceGrotesk_700Bold,
  });

  const appReady = fontsLoaded || !!fontError || fontFallbackReady;
  const assetsPromise = useMemo(() => Asset.loadAsync(preloadAssets), []);

  useEffect(() => {
    let active = true;
    const fallbackTimer = setTimeout(() => {
      if (active) {
        setFontFallbackReady(true);
      }
    }, 2500);

    Promise.all([assetsPromise]).finally(() => {
      if (active && appReady) {
        SplashScreen.hideAsync().catch(() => undefined);
      }
    });

    return () => {
      active = false;
      clearTimeout(fallbackTimer);
    };
  }, [appReady, assetsPromise]);

  if (!appReady) {
    return null;
  }

  return (
    <AppSessionProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="agent" />
        <Stack.Screen name="member" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AppSessionProvider>
  );
}
