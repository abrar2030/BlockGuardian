import { useState } from "react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import { useToast } from "../../context/ToastContext";
import { portfolioAPI } from "../../services/api";
import { PORTFOLIO_TYPES, RISK_LEVELS } from "../../utils/constants";
import { validateRequired } from "../../lib/validators";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"];

export default function CreatePortfolioModal({ isOpen, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: "",
    description: "",
    portfolioType: "personal",
    riskLevel: "moderate",
    baseCurrency: "USD",
    initialCash: "10000",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const update = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const reset = () => {
    setForm({
      name: "",
      description: "",
      portfolioType: "personal",
      riskLevel: "moderate",
      baseCurrency: "USD",
      initialCash: "10000",
    });
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nameError = validateRequired(form.name, "Portfolio name");
    if (nameError) {
      setErrors({ name: nameError });
      return;
    }

    setIsLoading(true);
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
      toast.error(err.message || "Failed to create portfolio");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Create a new portfolio"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          id="portfolioName"
          label="Portfolio name"
          placeholder="e.g. Growth Portfolio"
          value={form.name}
          onChange={update("name")}
          error={errors.name}
          required
        />
        <Input
          id="portfolioDescription"
          label="Description (optional)"
          placeholder="A short note about this portfolio's goal"
          value={form.description}
          onChange={update("description")}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            id="portfolioType"
            label="Type"
            options={PORTFOLIO_TYPES}
            value={form.portfolioType}
            onChange={update("portfolioType")}
          />
          <Select
            id="riskLevel"
            label="Risk level"
            options={RISK_LEVELS}
            value={form.riskLevel}
            onChange={update("riskLevel")}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            id="baseCurrency"
            label="Base currency"
            options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            value={form.baseCurrency}
            onChange={update("baseCurrency")}
          />
          <Input
            id="initialCash"
            label="Starting cash"
            type="number"
            min="0"
            step="0.01"
            value={form.initialCash}
            onChange={update("initialCash")}
          />
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Create Portfolio
          </Button>
        </div>
      </form>
    </Modal>
  );
}
