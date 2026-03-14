import * as React from "react";
import { createContext, useCallback, useContext } from "react";
import { Platform } from "react-native";

type WidgetContextType = {
  refreshWidget: () => void;
};

const WidgetContext = createContext<WidgetContextType | null>(null);

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  const refreshWidget = useCallback(() => {
    // Widget refresh is only supported on iOS with a configured App Group.
    // Skipping on other platforms to avoid crashes.
    if (Platform.OS !== "ios") return;
    try {
      // Dynamically import to avoid crashing on Android/web where the
      // native module is not available.
      const { ExtensionStorage } = require("@bacons/apple-targets");
      ExtensionStorage.reloadWidget();
    } catch (e) {
      console.warn("[WidgetContext] Widget refresh not available:", e);
    }
  }, []);

  return (
    <WidgetContext.Provider value={{ refreshWidget }}>
      {children}
    </WidgetContext.Provider>
  );
}

export const useWidget = () => {
  const context = useContext(WidgetContext);
  if (!context) {
    throw new Error("useWidget must be used within a WidgetProvider");
  }
  return context;
};
