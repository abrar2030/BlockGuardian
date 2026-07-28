import { createContext, useCallback, useContext, useState } from "react";
import { View, Text, StyleSheet } from "react-native";

const ToastContext = createContext(null);

let idCounter = 0;

const STYLES = {
  success: { bg: "#064e3b", border: "#10b981", text: "#a7f3d0" },
  error: { bg: "#450a0a", border: "#ef4444", text: "#fecaca" },
  info: { bg: "#1e1b4b", border: "#6366f1", text: "#c7d2fe" },
  warning: { bg: "#451a03", border: "#f59e0b", text: "#fde68a" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, type = "info", duration = 3500) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration) setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const toast = {
    success: (msg) => push(msg, "success"),
    error: (msg) => push(msg, "error"),
    info: (msg) => push(msg, "info"),
    warning: (msg) => push(msg, "warning"),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <View pointerEvents="none" style={styles.container}>
        {toasts.map((t) => {
          const s = STYLES[t.type] || STYLES.info;
          return (
            <View
              key={t.id}
              style={[
                styles.toast,
                { backgroundColor: s.bg, borderColor: s.border },
              ]}
            >
              <Text style={[styles.text, { color: s.text }]}>{t.message}</Text>
            </View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 40,
    left: 16,
    right: 16,
    gap: 8,
  },
  toast: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: {
    fontSize: 14,
    fontWeight: "500",
  },
});

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
