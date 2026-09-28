import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileBadge,
  HeartHandshake,
  Hospital,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
  Loader2,
  Smartphone,
  AlertCircle,
  X,
} from "lucide-react";
import DigitPinInput from "../components/DigitPinInput";
import { apiService, API_BASE_URL } from "../services/api";

export default function AuthPage({
  initialMode = "login",
  initialRole = "Donor",
  onAuthSuccess,
  onLoginSuccess,
  onBack,
}) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const formatRole = (r) => {
    if (!r) return "Donor";
    const lower = r.toLowerCase();
    if (lower.includes("hospital")) return "Hospital";
    if (lower.includes("bank")) return "Blood bank";
    if (lower.includes("admin")) return "Admin";
    return "Donor";
  };

  const [selectedRole, setSelectedRole] = useState(formatRole(initialRole));
  const [donorLoginMethod, setDonorLoginMethod] = useState("email"); // 'email' | 'mobile'

  // Mobile OTP States (Donor)
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");

  // Universal Forgot / Reset Password Modal States
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("request"); // 'request' | 'reset'
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  // Universal Form States
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [address, setAddress] = useState("");

  // Role-Specific Credentials
  const [donorBloodGroup, setDonorBloodGroup] = useState("O+");
  const [donorGovtIdLast4, setDonorGovtIdLast4] = useState("");
  const [phone, setPhone] = useState("");
  const [hospitalRegNo, setHospitalRegNo] = useState("");
  const [hospitalNabhCode, setHospitalNabhCode] = useState("");
  const [cmoPin, setCmoPin] = useState("");
  const [bloodBankLicenceNo, setBloodBankLicenceNo] = useState("");
  const [storageFacilityId, setStorageFacilityId] = useState("");
  const [adminSecretKey, setAdminSecretKey] = useState("");
  const [adminMfaCode, setAdminMfaCode] = useState("");

  // Refs to read latest field values in Google callback without re-initializing
  const donorDetailsRef = useRef({
    bloodGroup: donorBloodGroup,
    govtIdLast4: donorGovtIdLast4,
    phone,
  });

  useEffect(() => {
    donorDetailsRef.current = {
      bloodGroup: donorBloodGroup,
      govtIdLast4: donorGovtIdLast4,
      phone,
    };
  }, [donorBloodGroup, donorGovtIdLast4, phone]);

  const roles = [
    { name: "Donor", icon: HeartHandshake },
    { name: "Hospital", icon: Hospital },
    { name: "Blood bank", icon: Building2 },
    { name: "Admin", icon: ShieldCheck },
  ];

  const loginFields = {
    Donor: {
      title: "Donor login",
      description: "Access your verified donation log and emergency call queue.",
      identity: "Email Address",
      identityType: "email",
      identityIcon: Mail,
    },
    Hospital: {
      title: "Hospital command login",
      description: "Access clinical trauma and verified patient blood requests.",
      identity: "Hospital Clinical Licence / Reg Number or Email",
      identityType: "text",
      identityIcon: Hospital,
    },
    "Blood bank": {
      title: "Blood bank portal login",
      description: "Manage certified cold storage and live hospital dispatches.",
      identity: "Drug Control / FDA Bank Licence No. or Email",
      identityType: "text",
      identityIcon: Building2,
    },
    Admin: {
      title: "Administrator governance login",
      description: "Requires dual-factor authentication and hardware signature.",
      identity: "Master Administrator Email / Access ID",
      identityType: "text",
      identityIcon: KeyRound,
    },
  };

  const activeLogin = loginFields[selectedRole];
  const IdentityIcon = activeLogin.identityIcon;

  // Intercept reset password parameters from email links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get("mode");
    const tokenParam = params.get("token");
    const emailParam = params.get("email");

    if (modeParam === "reset" && tokenParam) {
      setResetToken(tokenParam);
      setResetEmail(emailParam || "");
      setModalMode("reset");
      setForgotModalOpen(true);
    }
  }, []);

  const getPasswordStrength = (pass) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const passwordScore = getPasswordStrength(password);

  // Google One-Tap & Button Init (Guarded against multiple initializations)
  useEffect(() => {
    if (selectedRole !== "Donor" || !window.google?.accounts?.id) return;

    if (!window.__googleAuthInitialized) {
      window.google.accounts.id.initialize({
        client_id:
          import.meta.env.VITE_GOOGLE_CLIENT_ID ||
          "YOUR_GOOGLE_CLIENT_ID_FALLBACK",
        callback: async (response) => {
          setIsLoading(true);
          setErrorMessage("");
          try {
            const currentDetails = donorDetailsRef.current;
            const res = await apiService.googleDonorAuth({
              credential: response.credential,
              bloodGroup: currentDetails.bloodGroup || "O+",
              govtIdLast4: currentDetails.govtIdLast4 || "0000",
              phone: currentDetails.phone || "",
            });

            if (!res.success) {
              setErrorMessage(res.message || "Google authentication failed");
              setIsLoading(false);
              return;
            }

            localStorage.setItem("vital_token", res.token);
            localStorage.setItem("vital_user", JSON.stringify(res.user));

            const callback = onLoginSuccess || onAuthSuccess;
            if (callback) callback(res.user);
          } catch (err) {
            setErrorMessage(
              err.response?.data?.message || "Failed to authenticate with Google."
            );
          } finally {
            setIsLoading(false);
          }
        },
      });
      window.__googleAuthInitialized = true;
    }

    const btnContainerId =
      mode === "login" ? "googleDonorBtnLogin" : "googleDonorBtnRegister";
    const targetElement = document.getElementById(btnContainerId);

    if (targetElement) {
      targetElement.innerHTML = "";
      window.google.accounts.id.renderButton(targetElement, {
        theme: "outline",
        size: "large",
        text: mode === "login" ? "signin_with" : "signup_with",
        shape: "pill",
        width: 320,
      });
    }
  }, [selectedRole, mode, onLoginSuccess, onAuthSuccess]);

  // 1. Donor Send Mobile OTP
  const handleSendMobileOtp = async (e) => {
    if (e) e.preventDefault();
    if (!identifier || identifier.trim().length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/donor/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: identifier }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      setPhoneOtpSent(true);
      setSuccessMessage(
        data.devOtpHint
          ? `${data.message} (Dev OTP Code: ${data.devOtpHint})`
          : data.message
      );
    } catch (err) {
      setErrorMessage(err.message || "Failed to dispatch mobile OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Donor Verify Mobile OTP
  const handleVerifyMobileOtp = async (e) => {
    if (e) e.preventDefault();
    if (!phoneOtp || phoneOtp.trim().length !== 6) {
      setErrorMessage("Please enter the 6-digit OTP code.");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/donor/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: identifier, otp: phoneOtp }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      localStorage.setItem("vital_token", data.token);
      localStorage.setItem("vital_user", JSON.stringify(data.user));

      const callback = onLoginSuccess || onAuthSuccess;
      if (callback) callback(data.user);
    } catch (err) {
      setErrorMessage(err.message || "Invalid or expired OTP code.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Universal Forgot Password Link Request
  const handleSendForgotEmail = async (e) => {
    e.preventDefault();
    if (!forgotIdentifier || !forgotIdentifier.trim()) {
      setForgotError("Please enter your registered email or credential.");
      return;
    }
    setForgotLoading(true);
    setForgotError("");
    setForgotSuccess("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: forgotIdentifier.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      setForgotSuccess(data.message);
    } catch (err) {
      setForgotError(err.message || "Failed to request password reset.");
    } finally {
      setForgotLoading(false);
    }
  };

  // 4. Universal Reset Password with Token
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setForgotError("Password must be at least 6 characters.");
      return;
    }
    setForgotLoading(true);
    setForgotError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: resetToken,
          email: resetEmail,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      setForgotSuccess("Password reset successful! You can now log in.");
      setTimeout(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
        setForgotModalOpen(false);
        setModalMode("request");
        setResetToken("");
        setResetEmail("");
        setNewPassword("");
        setSuccessMessage("Password changed successfully. Please log in.");
      }, 2000);
    } catch (err) {
      setForgotError(err.message || "Failed to reset password.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();

    if (mode === "login" && selectedRole === "Donor" && donorLoginMethod === "mobile") {
      if (!phoneOtpSent) {
        return handleSendMobileOtp(e);
      }
      return handleVerifyMobileOtp(e);
    }

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (mode === "register") {
      if (password !== confirmPassword) {
        setErrorMessage("Passwords do not match. Please re-enter.");
        setIsLoading(false);
        return;
      }
      if (password.length < 8) {
        setErrorMessage("Password must be at least 8 characters long.");
        setIsLoading(false);
        return;
      }
      if (selectedRole === "Donor") {
        if (donorGovtIdLast4.length !== 4) {
          setErrorMessage("National/Govt ID must be exactly 4 digits.");
          setIsLoading(false);
          return;
        }
        if (phone.length !== 10) {
          setErrorMessage("Mobile number must be exactly 10 digits.");
          setIsLoading(false);
          return;
        }
      }
      if (selectedRole === "Hospital" && cmoPin.length !== 6) {
        setErrorMessage("CMO PIN must be exactly 6 digits.");
        setIsLoading(false);
        return;
      }
      if (selectedRole === "Admin" && adminMfaCode.length !== 6) {
        setErrorMessage("Hardware MFA code must be exactly 6 digits.");
        setIsLoading(false);
        return;
      }
    }

    try {
      if (mode === "login") {
        const cleanIdentifier = identifier.trim();
        const effectiveEmail = cleanIdentifier.includes("@")
          ? cleanIdentifier.toLowerCase()
          : email.trim().toLowerCase() || cleanIdentifier.toLowerCase();

        const rolePayload = selectedRole === "Blood bank" ? "Blood Bank" : selectedRole;

        const response = await apiService.login({
          email: effectiveEmail,
          identifier: cleanIdentifier,
          password,
          role: rolePayload,
          licenseNumber: cleanIdentifier,
          registrationNumber: cleanIdentifier,
          cmoPin: selectedRole === "Hospital" ? cmoPin : undefined,
          adminMfaCode: selectedRole === "Admin" ? adminMfaCode : undefined,
        });

        if (!response.success) {
          setErrorMessage(response.message || "Login failed. Please verify credentials.");
          setIsLoading(false);
          return;
        }

        localStorage.setItem("vital_token", response.token);
        localStorage.setItem("vital_user", JSON.stringify(response.user));

        const callback = onLoginSuccess || onAuthSuccess;
        if (callback) callback(response.user);
      } else {
        const rolePayload = selectedRole === "Blood bank" ? "Blood Bank" : selectedRole;

        const response = await apiService.signup({
          role: rolePayload,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          bloodGroup: selectedRole === "Donor" ? donorBloodGroup : undefined,
          govtIdLast4: selectedRole === "Donor" ? donorGovtIdLast4.trim() : undefined,
          phone: selectedRole === "Donor" ? phone.trim() : undefined,
          cmoPin: selectedRole === "Hospital" ? cmoPin.trim() : undefined,
          adminMfaCode: selectedRole === "Admin" ? adminMfaCode.trim() : undefined,
          address: address.trim(),
          licenseNumber: selectedRole === "Hospital" ? hospitalRegNo.trim() : undefined,
          registrationNumber: selectedRole === "Blood bank" ? bloodBankLicenceNo.trim() : undefined,
        });

        if (!response.success) {
          setErrorMessage(response.message || "Registration failed.");
          setIsLoading(false);
          return;
        }

        setPassword("");
        setConfirmPassword("");
        setSuccessMessage("Account registered successfully! Please log in with your credentials.");
        setMode("login");
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || "Unable to communicate with the server. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-slider-page">
      <button className="slider-back" type="button" onClick={onBack}>
        <ArrowLeft size={18} />
        Back to website
      </button>

      <section className={`slider-auth ${mode === "register" ? "right-panel-active" : ""}`}>
        {/* REGISTER CONTAINER */}
        <div className="slider-form-container slider-sign-up">
          <form onSubmit={handleAuthSubmit} style={{ overflowY: "auto", maxHeight: "100%" }}>
            <div className="slider-brand">
              <span>✦</span>
              <span>VitalConnectAI</span>
            </div>

            <h1>Create Verified Account</h1>
            <p className="slider-description">
              Encrypted credential registration for clinical governance.
            </p>

            {errorMessage && (
              <div style={{ color: "#d91d35", fontSize: "11px", fontWeight: "bold", margin: "4px 0 8px" }}>
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div
                style={{
                  backgroundColor: "#ecfdf5",
                  color: "#065f46",
                  border: "1px solid #a7f3d0",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "600",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>✓</span>
                <span>{successMessage}</span>
              </div>
            )}

            <div className="auth-role-grid">
              {roles.map((role) => {
                const RoleIcon = role.icon;
                return (
                  <button
                    type="button"
                    key={role.name}
                    className={selectedRole === role.name ? "selected" : ""}
                    onClick={() => {
                      setSelectedRole(role.name);
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                  >
                    <RoleIcon size={15} />
                    <span>{role.name}</span>
                  </button>
                );
              })}
            </div>

            <label>
              <UserRound size={17} />
              <input
                type="text"
                placeholder={
                  selectedRole === "Hospital"
                    ? "Hospital Official Registered Name"
                    : selectedRole === "Blood bank"
                    ? "Blood Bank Organization Name"
                    : selectedRole === "Admin"
                    ? "Officer / Administrator Name"
                    : "Donor Full Legal Name"
                }
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>

            {selectedRole === "Donor" && (
              <>
                <label style={{ margin: "5px 0" }}>
                  <HeartHandshake size={17} />
                  <select
                    value={donorBloodGroup}
                    onChange={(e) => setDonorBloodGroup(e.target.value)}
                    style={{ border: "none", outline: "none", background: "transparent", width: "100%" }}
                  >
                    {["O+", "O−", "A+", "A−", "B+", "B−", "AB+", "AB−"].map((g) => (
                      <option key={g} value={g}>
                        {g} Blood Type
                      </option>
                    ))}
                  </select>
                </label>

                <div className="digit-field-group">
                  <span className="digit-field-label">National/Govt ID (Last 4 digits)</span>
                  <DigitPinInput length={4} value={donorGovtIdLast4} onChange={setDonorGovtIdLast4} />
                </div>

                <div className="digit-field-group">
                  <span className="digit-field-label">+91 Mobile Number</span>
                  <DigitPinInput length={10} value={phone} onChange={setPhone} />
                </div>
              </>
            )}

            {selectedRole === "Hospital" && (
              <>
                <label>
                  <Hospital size={17} />
                  <input
                    type="text"
                    placeholder="State Clinical Establishment Licence (e.g. HOSP-KA-9921)"
                    value={hospitalRegNo}
                    onChange={(e) => setHospitalRegNo(e.target.value)}
                    required
                  />
                </label>
                <label style={{ margin: "5px 0" }}>
                  <FileBadge size={17} />
                  <input
                    type="text"
                    placeholder="NABH / MCI ID"
                    value={hospitalNabhCode}
                    onChange={(e) => setHospitalNabhCode(e.target.value)}
                    required
                  />
                </label>
                <div className="digit-field-group">
                  <span className="digit-field-label">6-Digit CMO Emergency PIN</span>
                  <DigitPinInput length={6} value={cmoPin} onChange={setCmoPin} mask={true} />
                </div>
              </>
            )}

            {selectedRole === "Blood bank" && (
              <>
                <label>
                  <Building2 size={17} />
                  <input
                    type="text"
                    placeholder="Drug Controller / FDA Licence No. (e.g. DL-BB-4402)"
                    value={bloodBankLicenceNo}
                    onChange={(e) => setBloodBankLicenceNo(e.target.value)}
                    required
                  />
                </label>
                <label>
                  <KeyRound size={17} />
                  <input
                    type="text"
                    placeholder="Cold-Chain Unit Facility Certification Code"
                    value={storageFacilityId}
                    onChange={(e) => setStorageFacilityId(e.target.value)}
                    required
                  />
                </label>
              </>
            )}

            {selectedRole === "Admin" && (
              <>
                <label>
                  <KeyRound size={17} />
                  <input
                    type="password"
                    placeholder="Admin RSA 256-bit Cryptographic Key"
                    value={adminSecretKey}
                    onChange={(e) => setAdminSecretKey(e.target.value)}
                    required
                  />
                </label>
                <div className="digit-field-group">
                  <span className="digit-field-label">6-Digit Hardware Security MFA Code</span>
                  <DigitPinInput length={6} value={adminMfaCode} onChange={setAdminMfaCode} />
                </div>
              </>
            )}

            {(selectedRole === "Hospital" || selectedRole === "Blood bank") && (
              <label>
                <Building2 size={17} />
                <input
                  type="text"
                  placeholder="Facility Physical Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </label>
            )}

            <label>
              <Mail size={17} />
              <input
                type="email"
                placeholder="Institutional / Official Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label>
              <LockKeyhole size={17} />
              <input
                type="password"
                placeholder="Create Strong Password (min 8 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            {password && (
              <div style={{ width: "100%", margin: "2px 0 6px" }}>
                <div style={{ height: "4px", background: "#eee", borderRadius: "99px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${(passwordScore / 4) * 100}%`,
                      background:
                        passwordScore <= 2 ? "#e11d48" : passwordScore === 3 ? "#f59e0b" : "#10b981",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <span style={{ fontSize: "10px", color: "#888", display: "block", textAlign: "right", marginTop: "2px" }}>
                  {passwordScore <= 2 ? "Weak Password" : passwordScore === 3 ? "Moderate Strength" : "Strong Security ✓"}
                </span>
              </div>
            )}

            <label>
              <CheckCircle2 size={17} />
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </label>

            <button className="slider-submit" type="submit" disabled={isLoading} style={{ marginTop: "10px" }}>
              {isLoading ? (
                <>
                  <Loader2 size={17} className="animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  Verify & Register {selectedRole}
                  <ArrowRight size={17} />
                </>
              )}
            </button>

            {selectedRole === "Donor" && (
              <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "8px" }}>
                  <span style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
                  <span style={{ fontSize: "11px", color: "#9ca3af", fontWeight: "600", letterSpacing: "0.04em" }}>
                    OR CONTINUE WITH
                  </span>
                  <span style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
                </div>
                <div id="googleDonorBtnRegister" style={{ width: "100%", display: "flex", justifyContent: "center", minHeight: "44px" }} />
              </div>
            )}
          </form>
        </div>

        {/* LOGIN CONTAINER */}
        <div className="slider-form-container slider-sign-in">
          <form onSubmit={handleAuthSubmit} style={{ overflowY: "auto", maxHeight: "100%" }}>
            <div className="slider-brand">
              <span>✦</span>
              <span>VitalConnectAI</span>
            </div>

            <h1>{activeLogin.title}</h1>
            <p className="slider-description">{activeLogin.description}</p>

            {errorMessage && (
              <div style={{ color: "#d91d35", fontSize: "11px", fontWeight: "bold", margin: "4px 0 8px" }}>
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div
                style={{
                  backgroundColor: "#ecfdf5",
                  color: "#065f46",
                  border: "1px solid #a7f3d0",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "600",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>✓</span>
                <span>{successMessage}</span>
              </div>
            )}

            <div className="auth-role-grid">
              {roles.map((role) => {
                const RoleIcon = role.icon;
                return (
                  <button
                    type="button"
                    key={role.name}
                    className={selectedRole === role.name ? "selected" : ""}
                    onClick={() => {
                      setSelectedRole(role.name);
                      setErrorMessage("");
                      setSuccessMessage("");
                      setPhoneOtpSent(false);
                    }}
                  >
                    <RoleIcon size={15} />
                    <span>{role.name}</span>
                  </button>
                );
              })}
            </div>

            {selectedRole === "Donor" && (
              <div className="donor-login-methods">
                <button
                  type="button"
                  className={donorLoginMethod === "email" ? "active" : ""}
                  onClick={() => {
                    setDonorLoginMethod("email");
                    setIdentifier("");
                    setPhoneOtpSent(false);
                  }}
                >
                  <Mail size={15} />
                  Email & Password
                </button>

                <button
                  type="button"
                  className={donorLoginMethod === "mobile" ? "active" : ""}
                  onClick={() => {
                    setDonorLoginMethod("mobile");
                    setIdentifier("");
                    setPhoneOtpSent(false);
                  }}
                >
                  <Smartphone size={15} />
                  Quick Mobile OTP
                </button>
              </div>
            )}

            {/* Donor Quick Mobile OTP Flow */}
            {selectedRole === "Donor" && donorLoginMethod === "mobile" ? (
              <>
                {!phoneOtpSent ? (
                  <div className="digit-field-group">
                    <span className="digit-field-label">+91 Registered Mobile Number</span>
                    <DigitPinInput length={10} value={identifier} onChange={setIdentifier} />
                  </div>
                ) : (
                  <div className="digit-field-group">
                    <span className="digit-field-label">6-Digit Verification Code</span>
                    <DigitPinInput length={6} value={phoneOtp} onChange={setPhoneOtp} />
                    <button
                      type="button"
                      onClick={() => setPhoneOtpSent(false)}
                      style={{ background: "none", border: 0, color: "#776b70", fontSize: "11px", marginTop: "6px", cursor: "pointer", fontWeight: "700" }}
                    >
                      ← Change Phone Number
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <label>
                  <IdentityIcon size={17} />
                  <input
                    type={activeLogin.identityType}
                    placeholder={activeLogin.identity}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                  />
                </label>

                {selectedRole === "Admin" && (
                  <div className="digit-field-group">
                    <span className="digit-field-label">6-Digit Hardware Security MFA Code</span>
                    <DigitPinInput length={6} value={adminMfaCode} onChange={setAdminMfaCode} />
                  </div>
                )}

                {selectedRole === "Hospital" && (
                  <div className="digit-field-group">
                    <span className="digit-field-label">6-Digit CMO Authorisation PIN</span>
                    <DigitPinInput length={6} value={cmoPin} onChange={setCmoPin} mask={true} />
                  </div>
                )}

                <label>
                  <LockKeyhole size={17} />
                  <input
                    type="password"
                    placeholder="Secure Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </label>

                <button
                  type="button"
                  className="slider-forgot"
                  onClick={() => {
                    setModalMode("request");
                    setForgotModalOpen(true);
                    setForgotIdentifier(identifier);
                    setForgotError("");
                    setForgotSuccess("");
                  }}
                  style={{ background: "none", border: 0, textAlign: "left", padding: 0, cursor: "pointer" }}
                >
                  Forgot security credentials?
                </button>
              </>
            )}

            <button className="slider-submit" type="submit" disabled={isLoading} style={{ marginTop: "12px" }}>
              {isLoading ? (
                <>
                  <Loader2 size={17} className="animate-spin" /> Authenticating...
                </>
              ) : selectedRole === "Donor" && donorLoginMethod === "mobile" ? (
                phoneOtpSent ? (
                  <>
                    Verify & Enter Workspace <ArrowRight size={17} />
                  </>
                ) : (
                  <>
                    Send 6-Digit OTP <ArrowRight size={17} />
                  </>
                )
              ) : (
                <>
                  Authenticate as {selectedRole}
                  <ArrowRight size={17} />
                </>
              )}
            </button>

            {selectedRole === "Donor" && (
              <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "8px" }}>
                  <span style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
                  <span style={{ fontSize: "11px", color: "#9ca3af", fontWeight: "600", letterSpacing: "0.04em" }}>
                    OR CONTINUE WITH
                  </span>
                  <span style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
                </div>
                <div id="googleDonorBtnLogin" style={{ width: "100%", display: "flex", justifyContent: "center", minHeight: "44px" }} />
              </div>
            )}
          </form>
        </div>

        {/* RED SLIDING PANEL */}
        <div className="slider-overlay-container">
          <div className="slider-overlay">
            <div className="slider-panel slider-overlay-left">
              <p className="slider-kicker">WELCOME BACK</p>
              <h2>Your care network is ready.</h2>
              <p>Sign in to manage requests, donations, inventory, and verified emergency care.</p>
              <button className="slider-ghost" type="button" onClick={() => { setMode("login"); setErrorMessage(""); }}>
                Sign in
              </button>
            </div>

            <div className="slider-panel slider-overlay-right">
              <p className="slider-kicker">VITALCONNECTAI</p>
              <h2>Make every connection count.</h2>
              <p>Create your verified account and help make blood care faster, safer, and more human.</p>
              <button className="slider-ghost" type="button" onClick={() => { setMode("register"); setErrorMessage(""); }}>
                Create account
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* UNIVERSAL FORGOT / RESET PASSWORD MODAL */}
      {forgotModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(18, 14, 16, 0.7)",
            backdropFilter: "blur(6px)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
          onClick={() => {
            if (modalMode !== "reset") setForgotModalOpen(false);
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "420px",
              background: "#ffffff",
              borderRadius: "24px",
              padding: "32px",
              boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setForgotModalOpen(false)}
              style={{ position: "absolute", top: "20px", right: "20px", border: 0, background: "transparent", cursor: "pointer", color: "#776b70" }}
            >
              <X size={20} />
            </button>

            <h2 style={{ margin: "0 0 6px", fontSize: "20px", fontWeight: "800", color: "#191416" }}>
              {modalMode === "reset" ? "Choose New Password" : "Reset Security Credentials"}
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: "12px", color: "#776b70", lineHeight: 1.5 }}>
              {modalMode === "reset"
                ? `Enter a new password for ${resetEmail || "your account"}.`
                : "Enter your registered email address or facility ID to receive a secure password recovery link."}
            </p>

            {forgotError && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "#fff0f3", color: "#bd1230", borderRadius: "12px", fontSize: "12px", marginBottom: "16px", fontWeight: "600" }}>
                <AlertCircle size={16} /> {forgotError}
              </div>
            )}

            {forgotSuccess && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "#eaf8f1", color: "#16865d", borderRadius: "12px", fontSize: "12px", marginBottom: "16px", fontWeight: "600" }}>
                <CheckCircle2 size={16} /> {forgotSuccess}
              </div>
            )}

            {modalMode === "request" ? (
              <form onSubmit={handleSendForgotEmail} style={{ display: "grid", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: "#443b3e" }}>
                    Registered Email or License/ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. user@gmail.com or HOSP-KA-9921"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    style={{ width: "100%", height: "46px", padding: "0 14px", borderRadius: "12px", border: "1px solid #dfd5d8", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  style={{ height: "46px", background: "#bd1230", color: "#fff", border: 0, borderRadius: "12px", fontWeight: "800", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                >
                  {forgotLoading ? <Loader2 size={18} className="animate-spin" /> : "Send Recovery Email"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} style={{ display: "grid", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: "#443b3e" }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ width: "100%", height: "46px", padding: "0 14px", borderRadius: "12px", border: "1px solid #dfd5d8", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  style={{ height: "46px", background: "#16865d", color: "#fff", border: 0, borderRadius: "12px", fontWeight: "800", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                >
                  {forgotLoading ? <Loader2 size={18} className="animate-spin" /> : "Update Password & Return to Login"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}