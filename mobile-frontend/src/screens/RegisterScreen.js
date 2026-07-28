import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../components/Screen";
import Input from "../components/Input";
import Select from "../components/Select";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { COUNTRIES } from "../lib/constants";
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateRequired,
  PASSWORD_RULES,
} from "../lib/validators";

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    country: "US",
    phoneNumber: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const toast = useToast();

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const next = {
      firstName: validateRequired(form.firstName, "First name"),
      lastName: validateRequired(form.lastName, "Last name"),
      email: validateEmail(form.email),
      username: validateUsername(form.username),
      password: validatePassword(form.password),
      confirmPassword:
        form.password !== form.confirmPassword
          ? "Passwords do not match"
          : null,
      agreed: !agreed ? "You must accept the terms to continue" : null,
    };
    setErrors(next);
    return Object.values(next).every((v) => !v);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      const user = await register({
        email: form.email.trim().toLowerCase(),
        username: form.username.trim(),
        password: form.password,
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        country: form.country || undefined,
        phone_number: form.phoneNumber.trim() || undefined,
      });
      toast.success(`Welcome to BlockGuardian, ${user.first_name}!`);
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    } catch (err) {
      if (err.field) {
        setErrors((prev) => ({ ...prev, [mapField(err.field)]: err.message }));
      } else {
        setErrors((prev) => ({
          ...prev,
          form: err.message || "Registration failed. Please try again.",
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const passed = PASSWORD_RULES.filter((r) => r.test(form.password)).length;

  return (
    <Screen edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>
          Start tracking your portfolio in minutes
        </Text>
      </View>

      {errors.form && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errors.form}</Text>
        </View>
      )}

      <View style={styles.row}>
        <Input
          label="First name"
          placeholder="Jane"
          value={form.firstName}
          onChangeText={set("firstName")}
          error={errors.firstName}
          style={styles.half}
        />
        <Input
          label="Last name"
          placeholder="Doe"
          value={form.lastName}
          onChangeText={set("lastName")}
          error={errors.lastName}
          style={styles.half}
        />
      </View>

      <Input
        label="Email address"
        placeholder="you@example.com"
        keyboardType="email-address"
        value={form.email}
        onChangeText={set("email")}
        error={errors.email}
      />

      <Input
        label="Username"
        placeholder="jane_doe"
        value={form.username}
        onChangeText={set("username")}
        error={errors.username}
        hint={
          !errors.username
            ? "3-32 characters: letters, numbers, _ and -"
            : undefined
        }
      />

      <View style={styles.row}>
        <View style={styles.half}>
          <Select
            label="Country"
            options={COUNTRIES}
            value={form.country}
            onChange={set("country")}
          />
        </View>
        <Input
          label="Phone (optional)"
          placeholder="+1 555 123 4567"
          keyboardType="phone-pad"
          value={form.phoneNumber}
          onChangeText={set("phoneNumber")}
          style={styles.half}
        />
      </View>

      <Input
        label="Password"
        placeholder="••••••••••••"
        isSecure={!showPassword}
        value={form.password}
        onChangeText={set("password")}
        error={errors.password}
        icon="lock-closed-outline"
        rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
        onRightIconPress={() => setShowPassword((s) => !s)}
      />
      {form.password.length > 0 && (
        <View style={styles.strengthWrap}>
          <View style={styles.strengthTrack}>
            <View
              style={[
                styles.strengthFill,
                {
                  width: `${(passed / PASSWORD_RULES.length) * 100}%`,
                  backgroundColor:
                    passed <= 2
                      ? "#ef4444"
                      : passed <= 4
                        ? "#f59e0b"
                        : "#10b981",
                },
              ]}
            />
          </View>
        </View>
      )}

      <Input
        label="Confirm password"
        placeholder="••••••••••••"
        isSecure={!showPassword}
        value={form.confirmPassword}
        onChangeText={set("confirmPassword")}
        error={errors.confirmPassword}
        icon="lock-closed-outline"
      />

      <TouchableOpacity
        style={styles.checkboxRow}
        onPress={() => setAgreed((a) => !a)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
          {agreed && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
        <Text style={styles.checkboxLabel}>
          I agree to the Terms of Service and Privacy Policy
        </Text>
      </TouchableOpacity>
      {errors.agreed && <Text style={styles.errorText}>{errors.agreed}</Text>}

      <Button
        title="Create account"
        onPress={handleSubmit}
        isLoading={isLoading}
        size="lg"
        style={styles.submitBtn}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.footerLink}>Sign in</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

function mapField(backendField) {
  const map = {
    first_name: "firstName",
    last_name: "lastName",
    phone_number: "phoneNumber",
  };
  return map[backendField] || backendField;
}

const styles = StyleSheet.create({
  header: { marginTop: 16, marginBottom: 24, alignItems: "center" },
  title: { color: "#f8fafc", fontSize: 24, fontWeight: "800" },
  subtitle: {
    color: "#94a3b8",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  errorBanner: {
    backgroundColor: "#450a0a",
    borderColor: "#7f1d1d",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: { color: "#fca5a5", fontSize: 13 },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  strengthWrap: { marginTop: -8, marginBottom: 16 },
  strengthTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "#1e293b",
    overflow: "hidden",
  },
  strengthFill: { height: "100%", borderRadius: 3 },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#475569",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: "#4f46e5", borderColor: "#4f46e5" },
  checkboxLabel: { color: "#94a3b8", fontSize: 13, flex: 1, lineHeight: 18 },
  errorText: { color: "#ef4444", fontSize: 12, marginTop: 6 },
  submitBtn: { width: "100%", marginTop: 20 },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 28,
    marginBottom: 8,
  },
  footerText: { color: "#94a3b8", fontSize: 14 },
  footerLink: { color: "#818cf8", fontSize: 14, fontWeight: "700" },
});
