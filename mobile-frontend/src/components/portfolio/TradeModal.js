import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppModal from "../AppModal";
import Input from "../Input";
import Select from "../Select";
import Button from "../Button";
import { useToast } from "../../context/ToastContext";
import { portfolioAPI, assetAPI } from "../../lib/api";
import { formatCurrency } from "../../lib/format";

export default function TradeModal({
  visible,
  mode = "buy",
  portfolioId,
  holdings = [],
  presetSymbol,
  onClose,
  onSuccess,
}) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [assets, setAssets] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sellableAssets = useMemo(
    () =>
      holdings
        .filter((h) => Number(h.quantity) > 0 && h.asset)
        .map((h) => ({ ...h.asset, ownedQuantity: h.quantity })),
    [holdings],
  );

  useEffect(() => {
    if (!visible) return;
    setQuantity("1");
    setPrice("");
    setError("");
    setQuery("");

    if (mode === "sell") {
      const preset = presetSymbol
        ? sellableAssets.find((a) => a.symbol === presetSymbol)
        : sellableAssets[0];
      setSelected(preset || null);
      if (preset) setPrice(String(preset.current_price ?? ""));
    } else {
      setSelected(null);
      loadPopular();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mode, presetSymbol]);

  const loadPopular = async () => {
    setIsSearching(true);
    try {
      const results = await assetAPI.list({ limit: 12 });
      setAssets(results || []);
    } catch {
      setAssets([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (mode !== "buy" || !visible) return;
    if (query.trim().length < 2) {
      if (query.trim().length === 0) loadPopular();
      return;
    }
    setIsSearching(true);
    const handle = setTimeout(async () => {
      try {
        const results = await assetAPI.search(query.trim());
        setAssets(results || []);
      } catch {
        setAssets([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, mode, visible]);

  const selectAsset = (asset) => {
    setSelected(asset);
    setPrice(String(asset.current_price ?? ""));
    setError("");
  };

  const maxQuantity = selected?.ownedQuantity
    ? Number(selected.ownedQuantity)
    : null;
  const total = (Number(quantity) || 0) * (Number(price) || 0);

  const handleSubmit = async () => {
    if (!selected) {
      setError("Choose an asset first");
      return;
    }
    const qty = Number(quantity);
    const px = Number(price);
    if (!qty || qty <= 0) {
      setError("Quantity must be greater than zero");
      return;
    }
    if (!px || px <= 0) {
      setError("Price must be greater than zero");
      return;
    }
    if (mode === "sell" && maxQuantity !== null && qty > maxQuantity) {
      setError(`You only own ${maxQuantity} units of ${selected.symbol}`);
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      const action = mode === "buy" ? portfolioAPI.buy : portfolioAPI.sell;
      const data = await action(portfolioId, {
        assetSymbol: selected.symbol,
        quantity: qty,
        price: px,
      });
      toast.success(
        `${mode === "buy" ? "Bought" : "Sold"} ${qty} ${selected.symbol} @ ${formatCurrency(px)}`,
      );
      onSuccess?.(data);
    } catch (err) {
      setError(err.message || `Failed to ${mode} asset`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={mode === "buy" ? "Buy Asset" : "Sell Asset"}
      maxHeight="90%"
    >
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      {mode === "sell" ? (
        <Select
          label="Asset"
          options={sellableAssets.map((a) => ({
            value: a.symbol,
            label: `${a.symbol} — own ${a.ownedQuantity}`,
          }))}
          value={selected?.symbol || ""}
          onChange={(val) =>
            selectAsset(sellableAssets.find((a) => a.symbol === val))
          }
          placeholder={
            sellableAssets.length ? "Choose an asset" : "No holdings to sell"
          }
        />
      ) : (
        <View style={styles.searchWrap}>
          <Text style={styles.label}>Search asset</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by symbol or name"
            placeholderTextColor="#475569"
            value={query}
            onChangeText={setQuery}
          />
          <View style={styles.resultsBox}>
            {isSearching ? (
              <Text style={styles.mutedText}>Searching...</Text>
            ) : assets.length === 0 ? (
              <Text style={styles.mutedText}>No assets found</Text>
            ) : (
              <FlatList
                data={assets}
                keyExtractor={(item) => String(item.id)}
                style={{ maxHeight: 200 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.resultRow,
                      selected?.id === item.id && styles.resultRowActive,
                    ]}
                    onPress={() => selectAsset(item)}
                  >
                    <View>
                      <Text style={styles.resultSymbol}>
                        {item.symbol}{" "}
                        <Text style={styles.resultName}>{item.name}</Text>
                      </Text>
                    </View>
                    <Text style={styles.resultPrice}>
                      {formatCurrency(item.current_price, item.currency)}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      )}

      {selected && (
        <>
          <View style={styles.selectedBox}>
            <View>
              <Text style={styles.selectedSymbol}>{selected.symbol}</Text>
              <Text style={styles.selectedName}>{selected.name}</Text>
            </View>
            <Text style={styles.selectedPrice}>
              Market:{" "}
              {formatCurrency(selected.current_price, selected.currency)}
            </Text>
          </View>

          <View style={styles.row}>
            <Input
              label="Quantity"
              keyboardType="decimal-pad"
              value={quantity}
              onChangeText={setQuantity}
              hint={maxQuantity !== null ? `Max: ${maxQuantity}` : undefined}
              style={styles.half}
            />
            <Input
              label="Price per unit"
              keyboardType="decimal-pad"
              value={price}
              onChangeText={setPrice}
              style={styles.half}
            />
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Estimated total</Text>
            <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
          </View>
        </>
      )}

      <Button
        title={`${mode === "buy" ? "Buy" : "Sell"} ${selected?.symbol || ""}`}
        variant={mode === "sell" ? "danger" : "primary"}
        onPress={handleSubmit}
        isLoading={isSubmitting}
        isDisabled={!selected}
        style={styles.submitBtn}
      />
    </AppModal>
  );
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
  label: { color: "#94a3b8", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  searchWrap: { marginBottom: 16 },
  searchInput: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    color: "#f1f5f9",
    backgroundColor: "#0f172a",
    marginBottom: 10,
  },
  resultsBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
    overflow: "hidden",
  },
  mutedText: { color: "#64748b", fontSize: 13, padding: 14 },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1f2937",
  },
  resultRowActive: { backgroundColor: "#1e1b4b" },
  resultSymbol: { color: "#f1f5f9", fontSize: 14, fontWeight: "700" },
  resultName: { color: "#64748b", fontSize: 12, fontWeight: "400" },
  resultPrice: { color: "#94a3b8", fontSize: 13 },
  selectedBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  selectedSymbol: { color: "#f8fafc", fontSize: 14, fontWeight: "700" },
  selectedName: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  selectedPrice: { color: "#cbd5e1", fontSize: 13, fontWeight: "600" },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    marginBottom: 16,
  },
  totalLabel: { color: "#94a3b8", fontSize: 13 },
  totalValue: { color: "#f8fafc", fontSize: 15, fontWeight: "700" },
  submitBtn: { marginTop: 4 },
});
