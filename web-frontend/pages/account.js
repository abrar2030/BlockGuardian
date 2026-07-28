import { useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import Card, { CardHeader } from "../components/ui/Card";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Tabs from "../components/ui/Tabs";
import PasswordStrength from "../components/ui/PasswordStrength";
import MfaSetupModal from "../components/account/MfaSetupModal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { authAPI } from "../services/api";
import { formatDate, formatLabel, initials } from "../lib/format";
import { validatePassword, validateRequired } from "../lib/validators";

const TABS = [
  { value: "profile", label: "Profile" },
  { value: "security", label: "Security" },
];

const COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "IN", label: "India" },
  { value: "PK", label: "Pakistan" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "SG", label: "Singapore" },
  { value: "JP", label: "Japan" },
  { value: "BR", label: "Brazil" },
  { value: "OTHER", label: "Other" },
];

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const { user } = useAuth();

  if (!user) return null;

  return (
    <DashboardLayout title="Account Settings">
      <div className="space-y-6 animate-fade-in">
        <ProfileSummary user={user} />
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
        {activeTab === "profile" && <ProfileForm user={user} />}
        {activeTab === "security" && <SecuritySettings user={user} />}
      </div>
    </DashboardLayout>
  );
}

function ProfileSummary({ user }) {
  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
          {initials(user.first_name, user.last_name)}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {user.full_name || `${user.first_name} ${user.last_name}`}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            @{user.username} · {user.email}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge color="indigo">{formatLabel(user.role)}</Badge>
            <Badge color={user.kyc_status === "verified" ? "green" : "yellow"}>
              KYC: {formatLabel(user.kyc_status)}
            </Badge>
            <Badge color={user.mfa_enabled ? "green" : "gray"}>
              {user.mfa_enabled ? "2FA Enabled" : "2FA Disabled"}
            </Badge>
          </div>
        </div>
        <div className="text-sm text-gray-400 dark:text-gray-500 sm:text-right flex-shrink-0">
          Member since
          <p className="text-gray-700 dark:text-gray-300 font-medium">
            {formatDate(user.created_at)}
          </p>
        </div>
      </div>
    </Card>
  );
}

function ProfileForm({ user }) {
  const toast = useToast();
  const { setUser } = useAuth();
  const [form, setForm] = useState({
    firstName: user.first_name || "",
    lastName: user.last_name || "",
    city: user.city || "",
    country: user.country || "",
    phoneNumber: "",
    addressLine1: "",
    postalCode: "",
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const update = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const firstNameError = validateRequired(form.firstName, "First name");
    const lastNameError = validateRequired(form.lastName, "Last name");
    if (firstNameError || lastNameError) {
      setErrors({ firstName: firstNameError, lastName: lastNameError });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        city: form.city.trim(),
        country: form.country,
      };
      if (form.phoneNumber.trim())
        payload.phone_number = form.phoneNumber.trim();
      if (form.addressLine1.trim())
        payload.address_line1 = form.addressLine1.trim();
      if (form.postalCode.trim()) payload.postal_code = form.postalCode.trim();

      const updated = await authAPI.updateProfile(payload);
      setUser(updated);
      toast.success("Profile updated");
      setForm((f) => ({
        ...f,
        phoneNumber: "",
        addressLine1: "",
        postalCode: "",
      }));
    } catch (err) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Personal information"
        subtitle="Update your name and contact details"
      />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            id="firstName"
            label="First name"
            value={form.firstName}
            onChange={update("firstName")}
            error={errors.firstName}
            required
          />
          <Input
            id="lastName"
            label="Last name"
            value={form.lastName}
            onChange={update("lastName")}
            error={errors.lastName}
            required
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            id="city"
            label="City"
            value={form.city}
            onChange={update("city")}
          />
          <Select
            id="country"
            label="Country"
            options={COUNTRIES}
            placeholder="Select a country"
            value={form.country}
            onChange={update("country")}
          />
        </div>

        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 mt-4">
            For your security, previously saved phone number and address details
            aren&apos;t displayed here. Enter new values below to update them.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              id="phoneNumber"
              label="Phone number"
              type="tel"
              placeholder="+1 555 123 4567"
              value={form.phoneNumber}
              onChange={update("phoneNumber")}
            />
            <Input
              id="postalCode"
              label="Postal code"
              value={form.postalCode}
              onChange={update("postalCode")}
            />
          </div>
          <Input
            id="addressLine1"
            label="Street address"
            containerClassName="mt-4"
            value={form.addressLine1}
            onChange={update("addressLine1")}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" isLoading={isSaving}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}

function SecuritySettings({ user }) {
  return (
    <div className="space-y-6">
      <ChangePasswordCard />
      <MfaCard user={user} />
    </div>
  );
}

function ChangePasswordCard() {
  const toast = useToast();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const update = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {
      current: validateRequired(form.current, "Current password"),
      next: validatePassword(form.next),
      confirm: form.next !== form.confirm ? "Passwords do not match" : null,
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setIsSaving(true);
    try {
      await authAPI.changePassword(form.current, form.next);
      toast.success("Password changed successfully");
      setForm({ current: "", next: "", confirm: "" });
      setErrors({});
    } catch (err) {
      setErrors({ form: err.message || "Failed to change password" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Change password"
        subtitle="Use a strong, unique password"
      />
      {errors.form && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 text-sm text-red-700 dark:text-red-400">
          {errors.form}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <Input
          id="currentPassword"
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={form.current}
          onChange={update("current")}
          error={errors.current}
        />
        <div>
          <Input
            id="newPassword"
            label="New password"
            type="password"
            autoComplete="new-password"
            value={form.next}
            onChange={update("next")}
            error={errors.next}
          />
          <PasswordStrength password={form.next} />
        </div>
        <Input
          id="confirmNewPassword"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={update("confirm")}
          error={errors.confirm}
        />
        <Button type="submit" isLoading={isSaving}>
          Update password
        </Button>
      </form>
    </Card>
  );
}

function MfaCard({ user }) {
  const toast = useToast();
  const { setUser } = useAuth();
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleDisable = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      await authAPI.disableMfa(password);
      toast.success("Two-factor authentication disabled");
      setUser({ ...user, mfa_enabled: false });
      setShowDisable(false);
      setPassword("");
    } catch (err) {
      setError(err.message || "Failed to disable MFA");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Two-factor authentication"
        subtitle="Add an extra layer of security to your account"
        action={
          <Badge color={user.mfa_enabled ? "green" : "gray"}>
            {user.mfa_enabled ? "Enabled" : "Disabled"}
          </Badge>
        }
      />

      {user.mfa_enabled ? (
        showDisable ? (
          <form onSubmit={handleDisable} className="space-y-4 max-w-sm">
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Input
              id="disableMfaPassword"
              label="Confirm your password to disable 2FA"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="flex gap-3">
              <Button type="submit" variant="danger" isLoading={isSaving}>
                Disable 2FA
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowDisable(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="danger" onClick={() => setShowDisable(true)}>
            Disable two-factor authentication
          </Button>
        )
      ) : (
        <Button onClick={() => setShowSetup(true)}>
          Enable two-factor authentication
        </Button>
      )}

      <MfaSetupModal
        isOpen={showSetup}
        onClose={() => setShowSetup(false)}
        onEnabled={() => setUser({ ...user, mfa_enabled: true })}
      />
    </Card>
  );
}
