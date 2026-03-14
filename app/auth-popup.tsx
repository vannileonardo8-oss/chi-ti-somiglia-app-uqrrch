// This screen is no longer used — Better Auth popup flow has been replaced
// by Supabase OAuth via expo-web-browser. Kept as an empty route so existing
// deep links / navigation references don't 404.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function AuthPopupScreen() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to main auth screen if someone lands here directly
    router.replace("/auth");
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Reindirizzamento...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
  },
  text: {
    fontSize: 16,
    color: "#fff",
  },
});
