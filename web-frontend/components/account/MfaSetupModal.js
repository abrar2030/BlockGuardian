import { useEffect, useState } from "react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Modal from "../ui/Modal";
import { useToast } from "../../context/ToastContext";
import { authAPI } from "../../services/api";

export default function MfaSetupModal({ isOpen, onClose, onEnabled }) {
  const toast = useToast();
  const [step, setStep] = useState("loading"); // loading | scan | backup | error
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
    if (isOpen && !setupData) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleVerify = async (e) => {
    e.preventDefault();
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

  const handleFinish = () => {
    onEnabled?.();
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Set up two-factor authentication"
    >
      {step === "loading" && (
        <div className="py-10 flex justify-center">
          <div className="spinner h-8 w-8 border-t-transparent" />
        </div>
      )}

      {step === "error" && (
        <div className="text-center py-6">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <Button className="mt-4" onClick={start}>
            Try again
          </Button>
        </div>
      )}

      {step === "scan" && setupData && (
        <form onSubmit={handleVerify} className="space-y-5">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Scan this QR code with Google Authenticator, Authy, or any TOTP app,
            then enter the 6-digit code it generates.
          </p>
          <div className="flex justify-center">
            <div className="p-3 bg-white rounded-xl border border-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${setupData.qr_code}`}
                alt="MFA QR code"
                width={180}
                height={180}
              />
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">
              Can&apos;t scan? Enter manually:
            </p>
            <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded mt-1 inline-block break-all">
              {setupData.secret}
            </code>
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <Input
            id="mfaVerifyToken"
            label="Verification code"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            className="text-center text-2xl tracking-[0.5em] font-mono"
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
          />

          <Button type="submit" fullWidth isLoading={isVerifying}>
            Verify & enable
          </Button>
        </form>
      )}

      {step === "backup" && setupData && (
        <div className="space-y-5">
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-sm">
            <svg
              className="w-4 h-4 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            Save these one-time backup codes somewhere safe. Each can be used
            once if you lose access to your authenticator app.
          </div>
          <div className="grid grid-cols-2 gap-2">
            {setupData.backup_codes.map((code) => (
              <code
                key={code}
                className="text-sm font-mono text-center bg-gray-100 dark:bg-gray-800 rounded-lg py-2"
              >
                {code}
              </code>
            ))}
          </div>
          <Button fullWidth onClick={handleFinish}>
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
}
