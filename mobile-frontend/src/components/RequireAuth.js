import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function RequireAuth({ navigation, children }) {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    }
  }, [isLoading, isAuthenticated, navigation]);

  if (isLoading || !isAuthenticated) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.text}>Checking your session...</Text>
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#05070d",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  text: { color: "#94a3b8", fontSize: 14 },
});
