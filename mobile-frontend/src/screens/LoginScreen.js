import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Screen from "../components/Screen";
import Input from "../components/Input";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaToken, setMfaToken] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const toast = useToast();

  const handleSubmit = async () => {
    setErrors({});
    if (!email || !password) {
      setErrors({
        email: !email ? "Email is required" : undefined,
        password: !password ? "Password is required" : undefined,
      });
      return;
    }
    if (mfaRequired && mfaToken.trim().length < 6) {
      setErrors({ mfa: "Enter the 6-digit code from your authenticator app" });
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(
        email.trim(),
        password,
        mfaRequired ? mfaToken.trim() : undefined,
      );
      if (result.mfaRequired) {
        setMfaRequired(true);
        toast.info("Enter your two-factor authentication code to continue.");
        return;
      }
      toast.success(`Welcome back, ${result.user?.first_name || "there"}!`);
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    } catch (err) {
      if (err.status === 423) {
        setErrors({
          form: "This account is temporarily locked due to failed sign-in attempts.",
        });
      } else {
        setErrors({
          form: err.message || "Unable to sign in. Please try again.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {mfaRequired ? "Two-factor verification" : "Welcome back"}
        </Text>
        <Text style={styles.subtitle}>
          {mfaRequired
            ? "Enter the code from your authenticator app"
            : "Sign in to continue to your dashboard"}
        </Text>
      </View>

      {errors.form && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errors.form}</Text>
        </View>
      )}

      {!mfaRequired ? (
        <>
          <Input
            label="Email address"
            placeholder="you@example.com"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            icon="mail-outline"
          />
          <Input
            label="Password"
            placeholder="••••••••••••"
            isSecure={!showPassword}
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            icon="lock-closed-outline"
            rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
            onRightIconPress={() => setShowPassword((s) => !s)}
          />
        </>
      ) : (
        <Input
          label="Authentication code"
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
          value={mfaToken}
          onChangeText={(v) => setMfaToken(v.replace(/\D/g, ""))}
          error={errors.mfa}
          icon="keypad-outline"
        />
      )}

      <Button
        title={mfaRequired ? "Verify & sign in" : "Sign in"}
        onPress={handleSubmit}
        isLoading={isLoading}
        size="lg"
        style={styles.submitBtn}
      />

      {mfaRequired && (
        <TouchableOpacity
          onPress={() => {
            setMfaRequired(false);
            setMfaToken("");
            setErrors({});
          }}
          style={styles.backLink}
        >
          <Text style={styles.backLinkText}>
            ← Back to email &amp; password
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don&apos;t have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate("Register")}>
          <Text style={styles.footerLink}>Create one for free</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 24, marginBottom: 28, alignItems: "center" },
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
  submitBtn: { width: "100%", marginTop: 8 },
  backLink: { alignItems: "center", marginTop: 16 },
  backLinkText: { color: "#94a3b8", fontSize: 13 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 32 },
  footerText: { color: "#94a3b8", fontSize: 14 },
  footerLink: { color: "#818cf8", fontSize: 14, fontWeight: "700" },
});
