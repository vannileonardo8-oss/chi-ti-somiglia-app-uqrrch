
import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme, View, ActivityIndicator, Platform } from "react-native";
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

// Prevent the splash screen from auto-hiding before asset loading is complete.
// Wrap in try-catch to handle cases where splash screen isn't available
let splashScreenPrevented = false;
try {
  SplashScreen.preventAutoHideAsync();
  splashScreenPrevented = true;
  console.log('✅ SplashScreen.preventAutoHideAsync() succeeded');
} catch (error) {
  console.log('⚠️ SplashScreen.preventAutoHideAsync() failed (this is normal on reload):', error);
}

export const unstable_settings = {
  initialRouteName: "auth",
};

// Auth Guard Component - Shows auth screen first, allows skipping
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      console.log("⏳ Auth loading...");
      return;
    }

    const inAuthGroup = segments[0] === "auth" || segments[0] === "auth-popup" || segments[0] === "auth-callback";
    const inProtectedRoute = segments[0] === "(tabs)" || segments[0] === "results";

    console.log("🔍 Auth check:", { user: user?.email || "none", inAuthGroup, inProtectedRoute, segments });

    // If user is authenticated and on auth screen, redirect to home
    if (user && inAuthGroup) {
      console.log('✅ User authenticated, redirecting to home');
      router.replace("/(tabs)/(home)");
    }
    
    // If user is not authenticated and not on auth screens, redirect to auth
    // But only if they're trying to access protected features (like sharing results)
    if (!user && !inAuthGroup && segments[0] === "results") {
      console.log('🔒 Protected route accessed without auth, redirecting to auth');
      router.replace("/auth");
    }
  }, [user, loading, segments]);

  // Show loading screen while checking auth
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000" }}>
        <ActivityIndicator size="large" color="#FF6B9D" />
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
      // Only try to hide splash screen if we successfully prevented auto-hide
      if (splashScreenPrevented) {
        console.log('🎨 Fonts loaded, hiding splash screen...');
        SplashScreen.hideAsync().catch((error) => {
          console.log('⚠️ Error hiding splash screen (this is normal on reload):', error);
        });
      } else {
        console.log('🎨 Fonts loaded (splash screen was not prevented, so no need to hide)');
      }
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
