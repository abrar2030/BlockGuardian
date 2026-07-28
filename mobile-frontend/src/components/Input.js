import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const Input = ({
  label,
  placeholder,
  value,
  onChangeText,
  isSecure = false,
  icon,
  rightIcon,
  onRightIconPress,
  error,
  hint,
  keyboardType = "default",
  autoCapitalize = "none",
  autoCorrect = false,
  style,
  testID,
  editable = true,
  multiline = false,
  numberOfLines,
  onBlur,
  onFocus,
  returnKeyType,
  onSubmitEditing,
  maxLength,
}) => {
  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputRow,
          error ? styles.inputRowError : styles.inputRowNormal,
          !editable && styles.inputRowDisabled,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={error ? "#ef4444" : "#64748b"}
            style={styles.icon}
          />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#475569"
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onBlur={onBlur}
          onFocus={onFocus}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          maxLength={maxLength}
          style={[styles.input, multiline && styles.inputMultiline]}
          testID={testID}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} hitSlop={8}>
            <Ionicons name={rightIcon} size={18} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {!error && hint && <Text style={styles.hintText}>{hint}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { color: "#94a3b8", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    backgroundColor: "#0f172a",
  },
  inputRowNormal: { borderColor: "#334155" },
  inputRowError: { borderColor: "#ef4444" },
  inputRowDisabled: { opacity: 0.5 },
  icon: { marginRight: 10 },
  input: { flex: 1, color: "#f1f5f9", fontSize: 15, height: 48 },
  inputMultiline: {
    height: "auto",
    minHeight: 80,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  errorText: { color: "#ef4444", fontSize: 12 },
  hintText: { color: "#64748b", fontSize: 12, marginTop: 6 },
});

export default Input;
