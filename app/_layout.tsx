
import "react-native-reanimated";
import React, { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme, View, ActivityIndicator } from "react-native";
import { useNetworkState } from "expo-network";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

// Prevent splash screen from auto-hiding (with error handling)
try {
  SplashScreen.preventAutoHideAsync().catch(() => {
    console.log('[SplashScreen] preventAutoHideAsync not available (safe to ignore)');
  });
} catch (error) {
  console.log('[SplashScreen] preventAutoHideAsync error (safe to ignore)');
}

// Auth Guard Component - Modified to allow unauthenticated access to home
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!segments || segments.length === 0) return;

    const inAuthGroup = 
      segments[0] === "auth" || 
      segments[0] === "auth-popup" || 
      segments[0] === "auth-callback";

    console.log("[AuthGuard] user:", !!user, "loading:", loading, "segments:", segments, "inAuthGroup:", inAuthGroup);

    // If user is logged in and on auth page, redirect to home
    if (user && inAuthGroup) {
      console.log("[AuthGuard] User logged in, redirecting to home");
      router.replace("/(tabs)/(home)");
    }
    
    // Note: We no longer redirect unauthenticated users to /auth
    // They can access the app freely, but protected features will require login
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#1E3A8A" }}>
        <ActivityIndicator size="large" color="#FCD34D" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const networkState = useNetworkState();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      const hideSplash = async () => {
        try {
          await SplashScreen.hideAsync();
          console.log('[SplashScreen] Hidden successfully');
        } catch (error) {
          console.log('[SplashScreen] hideAsync error (safe to ignore):', error);
        }
      };

      setTimeout(hideSplash, 100);
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  const CustomDefaultTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: "rgb(0, 122, 255)",
      background: "rgb(242, 242, 247)",
      card: "rgb(255, 255, 255)",
      text: "rgb(0, 0, 0)",
      border: "rgb(216, 216, 220)",
      notification: "rgb(255, 59, 48)",
    },
  };

  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: "rgb(10, 132, 255)",
      background: "rgb(1, 1, 1)",
      card: "rgb(28, 28, 30)",
      text: "rgb(255, 255, 255)",
      border: "rgb(44, 44, 46)",
      notification: "rgb(255, 69, 58)",
    },
  };

  return (
    <>
      <StatusBar style="auto" animated />
      <ThemeProvider
        value={colorScheme === "dark" ? CustomDarkTheme : CustomDefaultTheme}
      >
        <AuthProvider>
          <AuthGuard>
            <WidgetProvider>
              <GestureHandlerRootView>
                <Stack>
                  <Stack.Screen name="auth" options={{ headerShown: false }} />
                  <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
                  <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="results/[id]" options={{ headerShown: false }} />
                  <Stack.Screen name="+not-found" options={{ title: "Oops!" }} />
                </Stack>
                <SystemBars style={"auto"} />
              </GestureHandlerRootView>
            </WidgetProvider>
          </AuthGuard>
        </AuthProvider>
      </ThemeProvider>
    </>
  );
}
