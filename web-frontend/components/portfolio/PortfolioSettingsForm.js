import { useState } from "react";
import { useRouter } from "next/router";
import Card, { CardHeader } from "../ui/Card";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import { useToast } from "../../context/ToastContext";
import { portfolioAPI } from "../../services/api";
import { RISK_LEVELS, ROUTES } from "../../utils/constants";
import { validateRequired } from "../../lib/validators";

export default function PortfolioSettingsForm({ portfolio, onUpdated }) {
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState({
    name: portfolio.name || "",
    description: portfolio.description || "",
    investmentObjective: portfolio.investment_objective || "",
    riskLevel: portfolio.risk_level || "moderate",
    maxPositionSize: String((portfolio.max_position_size ?? 0.1) * 100),
    maxSectorAllocation: String((portfolio.max_sector_allocation ?? 0.3) * 100),
    stopLossThreshold: String((portfolio.stop_loss_threshold ?? 0.05) * 100),
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const update = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    const nameError = validateRequired(form.name, "Portfolio name");
    if (nameError) {
      setErrors({ name: nameError });
      return;
    }
    setIsSaving(true);
    try {
      const updated = await portfolioAPI.update(portfolio.id, {
        name: form.name.trim(),
        description: form.description.trim(),
        investment_objective: form.investmentObjective.trim(),
        risk_level: form.riskLevel,
        max_position_size: Number(form.maxPositionSize) / 100,
        max_sector_allocation: Number(form.maxSectorAllocation) / 100,
        stop_loss_threshold: Number(form.stopLossThreshold) / 100,
      });
      toast.success("Portfolio settings saved");
      onUpdated?.(updated);
    } catch (err) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await portfolioAPI.remove(portfolio.id);
      toast.success("Portfolio deleted");
      router.push(ROUTES.PORTFOLIOS);
    } catch (err) {
      toast.error(err.message || "Failed to delete portfolio");
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Portfolio details"
          subtitle="Update the name, objective, and risk posture"
        />
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            id="settingsName"
            label="Portfolio name"
            value={form.name}
            onChange={update("name")}
            error={errors.name}
            required
          />
          <Input
            id="settingsDescription"
            label="Description"
            value={form.description}
            onChange={update("description")}
          />
          <Input
            id="settingsObjective"
            label="Investment objective"
            placeholder="e.g. Long-term capital growth"
            value={form.investmentObjective}
            onChange={update("investmentObjective")}
          />
          <Select
            id="settingsRiskLevel"
            label="Risk level"
            options={RISK_LEVELS}
            value={form.riskLevel}
            onChange={update("riskLevel")}
          />

          <div className="grid grid-cols-3 gap-4">
            <Input
              id="maxPositionSize"
              label="Max position size (%)"
              type="number"
              min="0"
              max="100"
              value={form.maxPositionSize}
              onChange={update("maxPositionSize")}
            />
            <Input
              id="maxSectorAllocation"
              label="Max sector allocation (%)"
              type="number"
              min="0"
              max="100"
              value={form.maxSectorAllocation}
              onChange={update("maxSectorAllocation")}
            />
            <Input
              id="stopLossThreshold"
              label="Stop-loss threshold (%)"
              type="number"
              min="0"
              max="100"
              value={form.stopLossThreshold}
              onChange={update("stopLossThreshold")}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" isLoading={isSaving}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>

      <Card className="border-red-100 dark:border-red-900/50">
        <CardHeader
          title="Danger zone"
          subtitle="Deleting a portfolio removes it from your dashboard. This cannot be undone."
        />
        <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
          Delete this portfolio
        </Button>
      </Card>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete portfolio?"
        maxWidth="max-w-sm"
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Are you sure you want to delete <strong>{portfolio.name}</strong>?
          This action cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => setShowDeleteConfirm(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            isLoading={isDeleting}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
