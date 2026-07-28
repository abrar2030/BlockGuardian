import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppModal from "../AppModal";
import Input from "../Input";
import Button from "../Button";
import { useToast } from "../../context/ToastContext";
import { authAPI } from "../../lib/api";

export default function MfaSetupSheet({ visible, onClose, onEnabled }) {
  const toast = useToast();
  const [step, setStep] = useState("loading");
  const [setupData, setSetupData] = useState(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const start = async () => {
    setStep("loading");
    setError("");
    try {
      const data = await authAPI.setupMfa();
      setSetupData(data);
      setStep("scan");
    } catch (err) {
      setError(err.message || "Failed to start MFA setup");
      setStep("error");
    }
  };

  useEffect(() => {
    if (visible && !setupData) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleVerify = async () => {
    if (token.trim().length < 6) {
      setError("Enter the 6-digit code from your authenticator app");
      return;
    }
    setIsVerifying(true);
    setError("");
    try {
      await authAPI.enableMfa(token.trim());
      toast.success("Two-factor authentication enabled");
      setStep("backup");
    } catch (err) {
      setError(err.message || "Invalid code — please try again");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setStep("loading");
    setSetupData(null);
    setToken("");
    setError("");
    onClose();
  };

  return (
    <AppModal
      visible={visible}
      onClose={handleClose}
      title="Set up two-factor authentication"
    >
      {step === "loading" && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      )}

      {step === "error" && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Try again" onPress={start} style={{ marginTop: 16 }} />
        </View>
      )}

      {step === "scan" && setupData && (
        <View>
          <Text style={styles.helperText}>
            Scan this QR code with Google Authenticator, Authy, or any TOTP app,
            then enter the 6-digit code it generates.
          </Text>
          <View style={styles.qrWrap}>
            <Image
              source={{ uri: `data:image/png;base64,${setupData.qr_code}` }}
              style={styles.qrImage}
            />
          </View>
          <Text style={styles.manualLabel}>
            Can&apos;t scan? Enter manually:
          </Text>
          <Text style={styles.secretText}>{setupData.secret}</Text>

          {error ? <Text style={styles.errorTextCenter}>{error}</Text> : null}

          <Input
            label="Verification code"
            keyboardType="number-pad"
            maxLength={6}
            value={token}
            onChangeText={(v) => setToken(v.replace(/\D/g, ""))}
            style={{ marginTop: 16 }}
          />
          <Button
            title="Verify & enable"
            onPress={handleVerify}
            isLoading={isVerifying}
            style={{ marginTop: 8 }}
          />
        </View>
      )}

      {step === "backup" && setupData && (
        <View>
          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={16} color="#fbbf24" />
            <Text style={styles.warningText}>
              Save these one-time backup codes somewhere safe. Each can be used
              once if you lose access to your authenticator app.
            </Text>
          </View>
          <View style={styles.codesGrid}>
            {setupData.backup_codes.map((code) => (
              <View key={code} style={styles.codeChip}>
                <Text style={styles.codeText}>{code}</Text>
              </View>
            ))}
          </View>
          <Button
            title="Done"
            onPress={() => {
              onEnabled?.();
              handleClose();
            }}
            style={{ marginTop: 20 }}
          />
        </View>
      )}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", paddingVertical: 30 },
  errorText: { color: "#f87171", fontSize: 14, textAlign: "center" },
  errorTextCenter: {
    color: "#f87171",
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
  },
  helperText: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  qrWrap: { alignItems: "center", marginBottom: 16 },
  qrImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  manualLabel: { color: "#64748b", fontSize: 12, textAlign: "center" },
  secretText: {
    color: "#cbd5e1",
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
    fontFamily: "monospace",
  },
  warningBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#451a03",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  warningText: { color: "#fde68a", fontSize: 12, flex: 1, lineHeight: 17 },
  codesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  codeChip: {
    flexBasis: "47%",
    backgroundColor: "#1e293b",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  codeText: { color: "#f1f5f9", fontFamily: "monospace", fontSize: 13 },
});
