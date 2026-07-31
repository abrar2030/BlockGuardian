import { useEffect, useMemo, useState } from "react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import { useToast } from "../../context/ToastContext";
import { portfolioAPI, assetAPI } from "../../services/api";
import { formatCurrency } from "../../lib/format";

export default function TradeModal({
  isOpen,
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

  // Reset state whenever the modal opens
  useEffect(() => {
    if (!isOpen) return;
    setQuantity("1");
    setPrice("");
    setError("");
    setQuery("");

    if (mode === "sell") {
      setAssets(sellableAssets);
      const preset = presetSymbol
        ? sellableAssets.find((a) => a.symbol === presetSymbol)
        : sellableAssets[0];
      setSelected(preset || null);
      if (preset) setPrice(String(preset.current_price ?? ""));
    } else {
      setSelected(null);
      loadPopularAssets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, presetSymbol]);

  const loadPopularAssets = async () => {
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

  // Debounced search for buy mode
  useEffect(() => {
    if (mode !== "buy" || !isOpen) return;
    if (query.trim().length < 2) {
      loadPopularAssets();
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
  }, [query, mode, isOpen]);

  const handleSelectAsset = (asset) => {
    setSelected(asset);
    setPrice(String(asset.current_price ?? ""));
    setError("");
  };

  const maxQuantity = selected?.ownedQuantity
    ? Number(selected.ownedQuantity)
    : null;
  const total = (Number(quantity) || 0) * (Number(price) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      setError(
        `You only own ${maxQuantity} shares/units of ${selected.symbol}`,
      );
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "buy" ? "Buy Asset" : "Sell Asset"}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {mode === "sell" ? (
          <Select
            id="sellAsset"
            label="Asset"
            options={sellableAssets.map((a) => ({
              value: a.symbol,
              label: `${a.symbol}: ${a.name} (own ${a.ownedQuantity})`,
            }))}
            value={selected?.symbol || ""}
            onChange={(e) =>
              handleSelectAsset(
                sellableAssets.find((a) => a.symbol === e.target.value),
              )
            }
            placeholder={
              sellableAssets.length ? undefined : "No holdings to sell"
            }
          />
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Search asset
            </label>
            <input
              className="input"
              placeholder="Search by symbol or name (e.g. AAPL, Bitcoin)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="mt-2 max-h-48 overflow-y-auto scrollbar-thin rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
              {isSearching ? (
                <p className="px-4 py-3 text-sm text-gray-400">Searching...</p>
              ) : assets.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400">
                  No assets found
                </p>
              ) : (
                assets.map((asset) => (
                  <button
                    type="button"
                    key={asset.id}
                    aria-label={`Select ${asset.symbol}`}
                    onClick={() => handleSelectAsset(asset)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${selected?.id === asset.id ? "bg-indigo-50 dark:bg-indigo-900/20" : ""}`}
                  >
                    <span>
                      <span className="font-medium text-sm text-gray-900 dark:text-white">
                        {asset.symbol}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">
                        {asset.name}
                      </span>
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatCurrency(asset.current_price, asset.currency)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {selected && (
          <>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">
                  {selected.symbol}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selected.name}
                </p>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Market:{" "}
                {formatCurrency(selected.current_price, selected.currency)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                id="quantity"
                label="Quantity"
                type="number"
                min="0"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                hint={maxQuantity !== null ? `Max: ${maxQuantity}` : undefined}
              />
              <Input
                id="price"
                label="Price per unit"
                type="number"
                min="0"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-gray-500 dark:text-gray-400">
                Estimated total
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(total)}
              </span>
            </div>
          </>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={mode === "sell" ? "danger" : "primary"}
            isLoading={isSubmitting}
            disabled={!selected}
          >
            {mode === "buy" ? "Buy" : "Sell"} {selected?.symbol || ""}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
