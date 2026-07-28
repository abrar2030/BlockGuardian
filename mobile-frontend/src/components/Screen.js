import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Screen({
  children,
  scroll = true,
  padded = true,
  refreshing = false,
  onRefresh,
  edges = ["top", "left", "right"],
  contentContainerStyle,
}) {
  return (
    <SafeAreaView style={styles.safeArea} edges={edges}>
      <StatusBar barStyle="light-content" backgroundColor="#05070d" />
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            padded && styles.padded,
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#6366f1"
                colors={["#6366f1"]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View
          style={[styles.flex, padded && styles.padded, contentContainerStyle]}
        >
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#05070d" },
  flex: { flex: 1 },
  padded: { padding: 20, paddingBottom: 40 },
});
