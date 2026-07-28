import { useState } from "react";
import { StyleSheet, View } from "react-native";
import AppModal from "../AppModal";
import Input from "../Input";
import Select from "../Select";
import Button from "../Button";
import { useToast } from "../../context/ToastContext";
import { portfolioAPI } from "../../lib/api";
import { PORTFOLIO_TYPES, RISK_LEVELS, CURRENCIES } from "../../lib/constants";
import { validateRequired } from "../../lib/validators";

export default function CreatePortfolioModal({ visible, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: "",
    description: "",
    portfolioType: "personal",
    riskLevel: "moderate",
    baseCurrency: "USD",
    initialCash: "10000",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const reset = () => {
    setForm({
      name: "",
      description: "",
      portfolioType: "personal",
      riskLevel: "moderate",
      baseCurrency: "USD",
      initialCash: "10000",
    });
    setError("");
  };

  const handleSubmit = async () => {
    const nameError = validateRequired(form.name, "Portfolio name");
    if (nameError) {
      setError(nameError);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await portfolioAPI.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        portfolio_type: form.portfolioType,
        risk_level: form.riskLevel,
        base_currency: form.baseCurrency,
        initial_cash: form.initialCash ? Number(form.initialCash) : 0,
      });
      toast.success("Portfolio created successfully");
      reset();
      onCreated?.();
    } catch (err) {
      setError(err.message || "Failed to create portfolio");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppModal
      visible={visible}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Create a new portfolio"
    >
      <Input
        label="Portfolio name"
        placeholder="e.g. Growth Portfolio"
        value={form.name}
        onChangeText={set("name")}
        error={error}
      />
      <Input
        label="Description (optional)"
        placeholder="A short note about this portfolio's goal"
        value={form.description}
        onChangeText={set("description")}
      />
      <View style={styles.row}>
        <View style={styles.half}>
          <Select
            label="Type"
            options={PORTFOLIO_TYPES}
            value={form.portfolioType}
            onChange={set("portfolioType")}
          />
        </View>
        <View style={styles.half}>
          <Select
            label="Risk level"
            options={RISK_LEVELS}
            value={form.riskLevel}
            onChange={set("riskLevel")}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <Select
            label="Base currency"
            options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            value={form.baseCurrency}
            onChange={set("baseCurrency")}
          />
        </View>
        <Input
          label="Starting cash"
          keyboardType="decimal-pad"
          value={form.initialCash}
          onChangeText={set("initialCash")}
          style={styles.half}
        />
      </View>
      <Button
        title="Create Portfolio"
        onPress={handleSubmit}
        isLoading={isLoading}
        style={styles.submitBtn}
      />
    </AppModal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  submitBtn: { marginTop: 8 },
});
