import React, { useState } from "react";
import API from "../services/api";

// Hidden admin credential-recovery page — intentionally not linked from the
// login screen or any nav. The recovery email is never editable here; it's
// fixed server-side (see backend/controllers/adminRecoveryController.js) and
// only ever displayed for reference. Reachable directly at /system/admin-recovery.
const RECOVERY_EMAIL = "sunny.rathore2012@gmail.com";

export default function AdminRecovery() {
  const [step, setStep] = useState("start"); // start -> otp-sent -> verified -> done
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleSendOtp = async () => {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await API.post("/admin-recovery/send-otp");
      setInfo(`A 6-digit code was sent to ${RECOVERY_EMAIL}.`);
      setStep("otp-sent");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await API.post("/admin-recovery/verify-otp", { otp });
      setResetToken(data.resetToken);
      setStep("verified");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetCredentials = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await API.post("/admin-recovery/set-credentials", {
        resetToken,
        newEmail,
        newPassword,
      });
      setStep("done");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .ar-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0b0f1a;
          font-family: 'DM Sans', system-ui, sans-serif;
          padding: 24px;
        }
        .ar-card {
          width: 100%;
          max-width: 420px;
          background: #12172400;
          background: #11162299;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 32px;
          color: #e5e7eb;
        }
        .ar-title { font-size: 20px; font-weight: 700; margin-bottom: 4px; color: #fff; }
        .ar-subtitle { font-size: 13px; color: #94a3b8; margin-bottom: 24px; }
        .ar-email-box {
          background: rgba(249,115,22,0.08);
          border: 1px solid rgba(249,115,22,0.25);
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 14px;
          color: #fdba74;
          margin-bottom: 20px;
          word-break: break-all;
        }
        .ar-label { font-size: 12px; color: #94a3b8; margin-bottom: 6px; display: block; }
        .ar-input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.12);
          background: #0b0f1a;
          color: #fff;
          font-size: 14px;
          margin-bottom: 16px;
          outline: none;
        }
        .ar-input:focus { border-color: #f97316; }
        .ar-btn {
          width: 100%;
          padding: 11px;
          border-radius: 8px;
          border: none;
          background: #f97316;
          color: #fff;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
        }
        .ar-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .ar-error { color: #f87171; font-size: 13px; margin-bottom: 14px; }
        .ar-info { color: #4ade80; font-size: 13px; margin-bottom: 14px; }
        .ar-done { text-align: center; color: #4ade80; font-size: 15px; }
      `}</style>

      <div className="ar-root">
        <div className="ar-card">
          <div className="ar-title">Admin Credential Recovery</div>
          <div className="ar-subtitle">Verify ownership of the recovery inbox to set a new admin email and password.</div>

          <div className="ar-email-box">OTP will be sent to: {RECOVERY_EMAIL}</div>

          {error && <div className="ar-error">{error}</div>}
          {info && step === "otp-sent" && <div className="ar-info">{info}</div>}

          {step === "start" && (
            <button className="ar-btn" onClick={handleSendOtp} disabled={loading}>
              {loading ? "Sending..." : "Send OTP"}
            </button>
          )}

          {step === "otp-sent" && (
            <form onSubmit={handleVerifyOtp}>
              <label className="ar-label">6-digit code</label>
              <input
                className="ar-input"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                autoFocus
              />
              <button className="ar-btn" type="submit" disabled={loading || otp.length !== 6}>
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
            </form>
          )}

          {step === "verified" && (
            <form onSubmit={handleSetCredentials}>
              <label className="ar-label">New admin login email</label>
              <input
                className="ar-input"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
              <label className="ar-label">New password</label>
              <input
                className="ar-input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
              />
              <label className="ar-label">Confirm password</label>
              <input
                className="ar-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
              />
              <button className="ar-btn" type="submit" disabled={loading}>
                {loading ? "Saving..." : "Set Admin Credentials"}
              </button>
            </form>
          )}

          {step === "done" && (
            <div className="ar-done">
              Admin credentials updated. You can now log in with the new email and password.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
