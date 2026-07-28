import { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Screen from "../components/Screen";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Input from "../components/Input";
import Select from "../components/Select";
import Button from "../components/Button";
import Tabs from "../components/Tabs";
import RequireAuth from "../components/RequireAuth";
import MfaSetupSheet from "../components/account/MfaSetupSheet";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { authAPI } from "../lib/api";
import { formatDate, formatLabel, initials } from "../lib/format";
import { validatePassword, validateRequired } from "../lib/validators";
import { COUNTRIES } from "../lib/constants";

const TABS = [
  { value: "profile", label: "Profile" },
  { value: "security", label: "Security" },
];

function AccountContent() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  if (!user) return null;

  const handleLogout = () => {
    Alert.alert(
      "Sign out?",
      "You'll need to sign in again to access your portfolios.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign out", style: "destructive", onPress: logout },
      ],
    );
  };

  return (
    <Screen>
      <Card>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {initials(user.first_name, user.last_name)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {user.full_name || `${user.first_name} ${user.last_name}`}
            </Text>
            <Text style={styles.handle}>
              @{user.username} · {user.email}
            </Text>
          </View>
        </View>
        <View style={styles.badgesRow}>
          <Badge color="indigo">{formatLabel(user.role)}</Badge>
          <Badge color={user.kyc_status === "verified" ? "green" : "yellow"}>
            KYC: {formatLabel(user.kyc_status)}
          </Badge>
          <Badge color={user.mfa_enabled ? "green" : "gray"}>
            {user.mfa_enabled ? "2FA On" : "2FA Off"}
          </Badge>
        </View>
        <Text style={styles.memberSince}>
          Member since {formatDate(user.created_at)}
        </Text>
      </Card>

      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === "profile" && <ProfileForm user={user} />}
      {activeTab === "security" && <SecuritySettings user={user} />}

      <Button
        title="Sign out"
        variant="secondary"
        onPress={handleLogout}
        style={{ marginTop: 8 }}
      />
    </Screen>
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

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
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
    <Card title="Personal information">
      <View style={styles.row}>
        <Input
          label="First name"
          value={form.firstName}
          onChangeText={set("firstName")}
          error={errors.firstName}
          style={styles.half}
        />
        <Input
          label="Last name"
          value={form.lastName}
          onChangeText={set("lastName")}
          error={errors.lastName}
          style={styles.half}
        />
      </View>
      <View style={styles.row}>
        <Input
          label="City"
          value={form.city}
          onChangeText={set("city")}
          style={styles.half}
        />
        <View style={styles.half}>
          <Select
            label="Country"
            options={COUNTRIES}
            value={form.country}
            onChange={set("country")}
            placeholder="Select"
          />
        </View>
      </View>

      <Text style={styles.privacyNote}>
        For your security, previously saved phone number and address details
        aren&apos;t displayed here. Enter new values to update them.
      </Text>
      <Input
        label="Phone number"
        keyboardType="phone-pad"
        value={form.phoneNumber}
        onChangeText={set("phoneNumber")}
      />
      <Input
        label="Postal code"
        value={form.postalCode}
        onChangeText={set("postalCode")}
      />
      <Input
        label="Street address"
        value={form.addressLine1}
        onChangeText={set("addressLine1")}
      />

      <Button
        title="Save changes"
        onPress={handleSave}
        isLoading={isSaving}
        style={{ marginTop: 8 }}
      />
    </Card>
  );
}

function SecuritySettings({ user }) {
  return (
    <View>
      <ChangePasswordCard />
      <MfaCard user={user} />
    </View>
  );
}

function ChangePasswordCard() {
  const toast = useToast();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
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
    <Card title="Change password">
      {errors.form && <Text style={styles.errorBannerText}>{errors.form}</Text>}
      <Input
        label="Current password"
        isSecure
        value={form.current}
        onChangeText={set("current")}
        error={errors.current}
      />
      <Input
        label="New password"
        isSecure
        value={form.next}
        onChangeText={set("next")}
        error={errors.next}
      />
      <Input
        label="Confirm new password"
        isSecure
        value={form.confirm}
        onChangeText={set("confirm")}
        error={errors.confirm}
      />
      <Button
        title="Update password"
        onPress={handleSubmit}
        isLoading={isSaving}
        style={{ marginTop: 4 }}
      />
    </Card>
  );
}

function MfaCard({ user }) {
  const toast = useToast();
  const { setUser } = useAuth();
  const [showSetup, setShowSetup] = useState(false);
  const [password, setPassword] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleDisable = async () => {
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
      <View style={styles.mfaHeader}>
        <Text style={styles.cardTitle}>Two-factor authentication</Text>
        <Badge color={user.mfa_enabled ? "green" : "gray"}>
          {user.mfa_enabled ? "Enabled" : "Disabled"}
        </Badge>
      </View>

      {user.mfa_enabled ? (
        showDisable ? (
          <View>
            {error ? <Text style={styles.errorBannerText}>{error}</Text> : null}
            <Input
              label="Confirm your password to disable 2FA"
              isSecure
              value={password}
              onChangeText={setPassword}
            />
            <View style={styles.row}>
              <Button
                title="Disable 2FA"
                variant="danger"
                onPress={handleDisable}
                isLoading={isSaving}
                style={styles.half}
              />
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setShowDisable(false)}
                style={styles.half}
              />
            </View>
          </View>
        ) : (
          <Button
            title="Disable two-factor authentication"
            variant="danger"
            onPress={() => setShowDisable(true)}
          />
        )
      ) : (
        <Button
          title="Enable two-factor authentication"
          onPress={() => setShowSetup(true)}
        />
      )}

      <MfaSetupSheet
        visible={showSetup}
        onClose={() => setShowSetup(false)}
        onEnabled={() => setUser({ ...user, mfa_enabled: true })}
      />
    </Card>
  );
}

export default function AccountScreen({ navigation }) {
  return (
    <RequireAuth navigation={navigation}>
      <AccountContent />
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  name: { color: "#f8fafc", fontSize: 16, fontWeight: "700" },
  handle: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  memberSince: { color: "#64748b", fontSize: 12 },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  privacyNote: {
    color: "#64748b",
    fontSize: 11,
    lineHeight: 16,
    marginVertical: 12,
  },
  errorBannerText: { color: "#f87171", fontSize: 13, marginBottom: 12 },
  mfaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  cardTitle: { color: "#f8fafc", fontSize: 15, fontWeight: "700" },
});
