import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import AppModal from "../AppModal";
import Input from "../Input";
import Select from "../Select";
import Button from "../Button";
import { useToast } from "../../context/ToastContext";
import { portfolioAPI } from "../../lib/api";
import { RISK_LEVELS } from "../../lib/constants";
import { validateRequired } from "../../lib/validators";

export default function PortfolioSettingsSheet({
  visible,
  portfolio,
  onClose,
  onUpdated,
  onDeleted,
}) {
  const toast = useToast();
  const [form, setForm] = useState(() => buildForm(portfolio));
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    const nameError = validateRequired(form.name, "Portfolio name");
    if (nameError) {
      setError(nameError);
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const updated = await portfolioAPI.update(portfolio.id, {
        name: form.name.trim(),
        description: form.description.trim(),
        risk_level: form.riskLevel,
        max_position_size: Number(form.maxPositionSize) / 100,
        max_sector_allocation: Number(form.maxSectorAllocation) / 100,
        stop_loss_threshold: Number(form.stopLossThreshold) / 100,
      });
      toast.success("Portfolio settings saved");
      onUpdated?.(updated);
    } catch (err) {
      setError(err.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete portfolio?",
      `Are you sure you want to delete "${portfolio.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: handleDelete },
      ],
    );
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await portfolioAPI.remove(portfolio.id);
      toast.success("Portfolio deleted");
      onDeleted?.();
    } catch (err) {
      toast.error(err.message || "Failed to delete portfolio");
      setIsDeleting(false);
    }
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Portfolio settings"
      maxHeight="90%"
    >
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      <Input
        label="Portfolio name"
        value={form.name}
        onChangeText={set("name")}
      />
      <Input
        label="Description"
        value={form.description}
        onChangeText={set("description")}
      />
      <Select
        label="Risk level"
        options={RISK_LEVELS}
        value={form.riskLevel}
        onChange={set("riskLevel")}
      />

      <View style={styles.row}>
        <Input
          label="Max position %"
          keyboardType="decimal-pad"
          value={form.maxPositionSize}
          onChangeText={set("maxPositionSize")}
          style={styles.third}
        />
        <Input
          label="Max sector %"
          keyboardType="decimal-pad"
          value={form.maxSectorAllocation}
          onChangeText={set("maxSectorAllocation")}
          style={styles.third}
        />
        <Input
          label="Stop-loss %"
          keyboardType="decimal-pad"
          value={form.stopLossThreshold}
          onChangeText={set("stopLossThreshold")}
          style={styles.third}
        />
      </View>

      <Button
        title="Save changes"
        onPress={handleSave}
        isLoading={isSaving}
        style={{ marginBottom: 24 }}
      />

      <View style={styles.dangerZone}>
        <Text style={styles.dangerTitle}>Danger zone</Text>
        <Text style={styles.dangerText}>
          Deleting a portfolio removes it permanently.
        </Text>
        <Button
          title="Delete this portfolio"
          variant="danger"
          onPress={confirmDelete}
          isLoading={isDeleting}
          style={{ marginTop: 12 }}
        />
      </View>
    </AppModal>
  );
}

function buildForm(portfolio) {
  return {
    name: portfolio?.name || "",
    description: portfolio?.description || "",
    riskLevel: portfolio?.risk_level || "moderate",
    maxPositionSize: String((portfolio?.max_position_size ?? 0.1) * 100),
    maxSectorAllocation: String(
      (portfolio?.max_sector_allocation ?? 0.3) * 100,
    ),
    stopLossThreshold: String((portfolio?.stop_loss_threshold ?? 0.05) * 100),
  };
}

const styles = StyleSheet.create({
  errorBanner: {
    backgroundColor: "#450a0a",
    borderColor: "#7f1d1d",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: { color: "#fca5a5", fontSize: 13 },
  row: { flexDirection: "row", gap: 10 },
  third: { flex: 1 },
  dangerZone: {
    borderWidth: 1,
    borderColor: "#7f1d1d",
    borderRadius: 14,
    padding: 16,
  },
  dangerTitle: { color: "#f87171", fontSize: 14, fontWeight: "700" },
  dangerText: { color: "#94a3b8", fontSize: 12, marginTop: 4 },
});
