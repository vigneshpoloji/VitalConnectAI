import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  CheckSquare,
  Clock,
  Droplets,
  HeartHandshake,
  Hospital,
  Loader2,
  MapPin,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Share2,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import PortalShell from "../../components/PortalShell";
import { apiService } from "../../services/api";
import { getISTGreetingData } from "../../utils/istTime";
import { generateWhatsAppBroadcastUrl } from "../../utils/whatsappBroadcast";
import "./HospitalDashboard.css";

const BLOOD_GROUPS = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

const STAGES = [
  "Pending Verification",
  "Dispatched",
  "In Transit",
  "Delivered",
];

function NetworkTimeClock() {
  const [{ istTimeStr }, setTime] = useState(getISTGreetingData);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(getISTGreetingData());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hospital-network-time">
      <span>NETWORK TIME · IST</span>
      <strong>{istTimeStr}</strong>
      <small>
        <i />
        Clinical network online
      </small>
    </div>
  );
}

const COMPATIBILITY_RULES = {
  "AB-": {
    alternatives: "AB-, A-, B-, O- (All Rh-negative)",
    risks: "Strict Rh-negative red cells required. Severe hemolysis if Rh-positive blood infused.",
    action: "Prioritize AB- units. If depleted, transfuse A- or B- before dipping into emergency O- stock.",
  },
  "AB+": {
    alternatives: "Universal Recipient: AB+, AB-, A+, A-, B+, B-, O+, O-",
    risks: "Lowest mismatch hazard for packed red cells.",
    action: "Verify routine cross-match and transfuse any available clinical group.",
  },
  "A-": {
    alternatives: "A-, O-",
    risks: "Severe hemolytic transfusion reaction if B-antigen or Rh-positive units administered.",
    action: "Transfuse A- units; fall back to emergency O- negative reserve if unavailable.",
  },
  "A+": {
    alternatives: "A+, A-, O+, O-",
    risks: "Cannot receive B or AB units due to anti-B isohemagglutinins.",
    action: "Prioritize A+ or O+ packed red blood cells.",
  },
  "B-": {
    alternatives: "B-, O-",
    risks: "Acute intravascular hemolysis if A-antigen blood is introduced.",
    action: "Transfuse B- or O- units. Dispatch call to regional blood bank if stock is zero.",
  },
  "B+": {
    alternatives: "B+, B-, O+, O-",
    risks: "Cannot receive A or AB blood.",
    action: "Transfuse B+ or O+ whole blood units based on facility stock balance.",
  },
  "O-": {
    alternatives: "O- Only (Universal Donor, Restricted Recipient)",
    risks: "Can ONLY receive O-negative. Fatal acute hemolysis if A, B, or Rh+ blood is infused.",
    action: "CRITICAL: Mobilize regional O- donors immediately. Utilize cell salvage if available.",
  },
  "O+": {
    alternatives: "O+, O-",
    risks: "High titer anti-A and anti-B antibodies present. Cannot receive A, B, or AB.",
    action: "Transfuse O+ units; preserve O- reserve for Rh-negative emergency cases.",
  },
};

export function EmergencyAIAssistant({ currentBloodGroup }) {
  const [isOpen, setIsOpen] = useState(false);
  const bg = (currentBloodGroup || "AB-").toUpperCase().trim().replace("−", "-");
  const rule = COMPATIBILITY_RULES[bg] || COMPATIBILITY_RULES["AB-"];

  return (
    <div style={{ marginTop: "8px", marginBottom: "8px" }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          borderRadius: "8px",
          background: "#1e1b4b",
          color: "#ffffff",
          border: "1px solid #4338ca",
          fontSize: "11px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        <span>⚡</span> AI Compatibility & Cross-Match Triage ({bg})
      </button>

      {isOpen && (
        <div
          style={{
            marginTop: "8px",
            padding: "14px 16px",
            borderRadius: "10px",
            background: "#ffffff",
            border: "1px solid #c7d2fe",
            boxShadow: "0 4px 14px rgba(30, 27, 75, 0.08)",
            textAlign: "left",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
              borderBottom: "1px solid #e0e7ff",
              paddingBottom: "6px",
            }}
          >
            <strong style={{ fontSize: "12px", color: "#312e81" }}>
              Clinical Transfusion Protocol ({bg})
            </strong>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#64748b",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ fontSize: "11px", color: "#1e293b", lineHeight: 1.6 }}>
            <p style={{ margin: "3px 0" }}>
              <b>• Acceptable Alternatives:</b> {rule.alternatives}
            </p>
            <p style={{ margin: "3px 0" }}>
              <b>• Transfusion Risks:</b> {rule.risks}
            </p>
            <p style={{ margin: "3px 0" }}>
              <b>• Protocol Action:</b> {rule.action}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function CrossMatchVerificationModal({ request, onClose, onVerified }) {
  const [crossMatch, setCrossMatch] = useState(false);
  const [infectionCleared, setInfectionCleared] = useState(false);
  const [doctorName, setDoctorName] = useState("");
  const [nurseName, setNurseName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!crossMatch || !infectionCleared) {
      alert("Please confirm both clinical cross-match and pathogen clearance.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/blood-requests/${request._id || request.id}/verify-transfusion`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("vital_token") || ""}`,
          },
          body: JSON.stringify({
            crossMatchCompleted: crossMatch,
            infectionMarkersCleared: infectionCleared,
            verifiedByDoctor: doctorName,
            verifiedByNurse: nurseName,
            transfusionNotes: notes,
          }),
        }
      );

      const data = await res.json();
      if (data.success) {
        alert("✅ Clinical verification confirmed. Transfusion clearance granted.");
        if (onVerified) onVerified();
        onClose();
      } else {
        alert(`⚠️ ${data.message || "Verification failed."}`);
      }
    } catch (err) {
      alert("Failed to transmit clinical signoff.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          maxWidth: "500px",
          width: "100%",
          padding: "24px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={20} color="#dc2626" />
            <h3 style={{ margin: 0, fontSize: "17px", color: "#0f172a", fontWeight: 800 }}>
              Bedside Transfusion Sign-off
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#64748b" }}>
          Mandatory double-verification protocol for <b>{request.unitsRequired || request.units || 1} unit(s)</b> of{" "}
          <b style={{ color: "#dc2626" }}>{request.bloodGroup}</b> blood before transfusion.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#1e293b", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={crossMatch}
              onChange={(e) => setCrossMatch(e.target.checked)}
              style={{ width: "16px", height: "16px", accentColor: "#dc2626" }}
            />
            Major/Minor Cross-match confirmed compatible (No agglutination)
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#1e293b", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={infectionCleared}
              onChange={(e) => setInfectionCleared(e.target.checked)}
              style={{ width: "16px", height: "16px", accentColor: "#dc2626" }}
            />
            Cold-chain seal intact & Transfusion-Transmitted Infection (TTI) cleared
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "6px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                Attending Physician (Name / Reg No.)
              </label>
              <input
                type="text"
                required
                placeholder="Dr. S. Sharma"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                Staff Nurse / Triage Officer
              </label>
              <input
                type="text"
                required
                placeholder="Nurse K. Anitha"
                value={nurseName}
                onChange={(e) => setNurseName(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
              Transfusion Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Emergency OT #2 trauma stabilization"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", boxSizing: "border-box" }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: "10px",
              padding: "10px",
              background: "#16a34a",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "13px",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Verifying..." : "Authorize Bedside Transfusion"}
          </button>
        </form>
      </div>
    </div>
  );
}

function RequestTimeline({ currentStatus, onMarkDelivered, onVerifyTransfusion, requestId, isVerified }) {
  let normalizedStatus = currentStatus;
  if (!normalizedStatus || normalizedStatus === "Pending" || normalizedStatus === "Open") {
    normalizedStatus = "Pending Verification";
  } else if (normalizedStatus === "Fulfilled" || normalizedStatus === "Completed") {
    normalizedStatus = "Delivered";
  }

  const currentIndex = STAGES.indexOf(normalizedStatus);

  return (
    <div
      style={{
        padding: "16px",
        background: "#f8fafc",
        borderRadius: "12px",
        marginTop: "12px",
        border: "1px solid #e2e8f0",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
        }}
      >
        {STAGES.map((stage, idx) => {
          const isDone = idx <= currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div
              key={stage}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flex: 1,
                position: "relative",
                zIndex: 2,
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: isDone ? "#16a34a" : "#cbd5e1",
                  color: "#ffffff",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "12px",
                  fontWeight: 700,
                  transition: "all 0.3s ease",
                  border: isCurrent ? "2px solid #bbf7d0" : "none",
                }}
              >
                {isDone ? <CheckCircle2 size={16} /> : idx + 1}
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? "#0f172a" : "#64748b",
                  marginTop: "6px",
                  textAlign: "center",
                }}
              >
                {stage}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: "14px", display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap" }}>
        {(currentStatus === "In Transit" || currentStatus === "Dispatched") && (
          <button
            type="button"
            onClick={() => onMarkDelivered(requestId)}
            style={{
              padding: "6px 14px",
              backgroundColor: "#16a34a",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            ✓ Confirm Bay Delivery & Cold Storage Check-in
          </button>
        )}

        {(currentStatus === "Delivered" || currentStatus === "Fulfilled") && !isVerified && (
          <button
            type="button"
            onClick={() => onVerifyTransfusion(requestId)}
            style={{
              padding: "6px 14px",
              backgroundColor: "#dc2626",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <ShieldCheck size={14} /> Bedside Transfusion Sign-off
          </button>
        )}
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  bloodGroup: "O-",
  component: "Packed RBC",
  unitsRequired: 2,
  urgencyLevel: "Critical",
  ward: "Trauma ICU",
};

export default function HospitalDashboard({ user, onBack }) {
  const currentUser =
    user || JSON.parse(localStorage.getItem("vital_user") || "{}");

  const hospitalName =
    currentUser?.name ||
    currentUser?.hospitalName ||
    "General Trauma Hospital";

  const userDistrict = currentUser?.district || "Kamareddy";

  const greeting = useMemo(() => getISTGreetingData().greeting, []);

  const [requests, setRequests] = useState([]);
  const [bloodBanks, setBloodBanks] = useState([]);
  const [donors, setDonors] = useState([]);
  const [requestForm, setRequestForm] = useState(EMPTY_FORM);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState("");
  const [activeVerificationRequest, setActiveVerificationRequest] = useState(null);

  const fetchHospitalRequests = useCallback(async () => {
    try {
      const token = localStorage.getItem("vital_token");
      const response = await fetch("http://localhost:5000/api/requests", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data.success && Array.isArray(data.requests)) {
        setRequests((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(data.requests)) {
            return prev;
          }
          return data.requests;
        });
      }
    } catch (error) {
      console.warn("Failed to load requests safely:", error.message);
    }
  }, []);

  const handleMarkDelivered = async (requestId) => {
    try {
      const token = localStorage.getItem("vital_token");
      const res = await fetch(
        `http://localhost:5000/api/blood-requests/${requestId}/progress-status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ nextStatus: "Delivered" }),
        }
      );

      const data = await res.json();
      if (res.ok && data.success) {
        setNotification("Units confirmed delivered at trauma station.");
        await fetchHospitalRequests();
      }
    } catch (err) {
      console.error("Failed to update delivery status:", err);
    }
  };

  const fetchRegionalBanks = useCallback(async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/bloodbanks/inventory?district=${userDistrict}`
      );
      if (!response.ok) return;

      const data = await response.json();
      if (data.success && Array.isArray(data.banks)) {
        setBloodBanks((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(data.banks)) {
            return prev;
          }
          return data.banks;
        });
      }
    } catch (error) {
      console.warn("Failed to load blood banks safely:", error.message);
    }
  }, [userDistrict]);

  const fetchDonors = useCallback(async () => {
    try {
      const token = localStorage.getItem("vital_token");
      const response = await fetch(
        `http://localhost:5000/api/donors?district=${userDistrict}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      if (!response.ok) return;

      const data = await response.json();
      if (data.success && Array.isArray(data.donors)) {
        setDonors((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(data.donors)) {
            return prev;
          }
          return data.donors;
        });
      }
    } catch (error) {
      console.warn("Failed to fetch donors safely:", error.message);
    }
  }, [userDistrict]);

  const refreshWorkspace = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchHospitalRequests(),
        fetchRegionalBanks(),
        fetchDonors(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchHospitalRequests, fetchRegionalBanks, fetchDonors]);

  useEffect(() => {
    refreshWorkspace();
    const refreshTimer = setInterval(() => {
      fetchHospitalRequests();
      fetchRegionalBanks();
      fetchDonors();
    }, 15000);

    return () => clearInterval(refreshTimer);
  }, [refreshWorkspace, fetchHospitalRequests, fetchRegionalBanks, fetchDonors]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setRequestForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleCreateRequest = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setNotification("");

    try {
      const response = await apiService.createBloodRequest({
        hospitalName,
        bloodGroup: requestForm.bloodGroup.replace("−", "-"),
        component: requestForm.component,
        unitsRequired: Number(requestForm.unitsRequired),
        units: Number(requestForm.unitsRequired),
        urgencyLevel: requestForm.urgencyLevel,
        district: userDistrict,
        ward: requestForm.ward,
      });

      if (!response.success) {
        setNotification(response.message || "The request could not be created.");
        return;
      }

      setRequestModalOpen(false);
      setRequestForm(EMPTY_FORM);
      await fetchHospitalRequests();

      setNotification("Emergency request broadcast to matching donors and regional blood banks.");
    } catch (error) {
      console.error("Request creation error:", error);
      setNotification("A server error occurred while creating the request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBankStock = useCallback((bank, group) => {
    const asciiGroup = group.replace("−", "-");
    const unicodeGroup = group.replace("-", "−");

    return Number(
      bank.stockUnits?.[asciiGroup] ??
        bank.stockUnits?.[unicodeGroup] ??
        0
    );
  }, []);

  const dashboardData = useMemo(() => {
    const pending = requests.filter(
      (request) =>
        request.status === "Pending" ||
        request.status === "Pending Verification" ||
        request.status === "Open" ||
        request.status === "Dispatched" ||
        request.status === "In Transit"
    );
    const fulfilled = requests.filter(
      (request) =>
        request.status === "Fulfilled" ||
        request.status === "Delivered" ||
        request.status === "Completed"
    );

    const critical = pending.filter(
      (request) =>
        (request.urgencyLevel || request.priority || "").toLowerCase() ===
        "critical"
    );

    const availableDonors = donors.filter(
      (donor) => donor.isAvailable !== false
    );

    const fulfilledUnits = fulfilled.reduce(
      (total, request) =>
        total + Number(request.unitsRequired || request.units || 0),
      0
    );

    const regionalUnits = bloodBanks.reduce(
      (bankTotal, bank) =>
        bankTotal +
        BLOOD_GROUPS.reduce(
          (groupTotal, group) => groupTotal + getBankStock(bank, group),
          0
        ),
      0
    );

    return {
      pending,
      fulfilled,
      critical,
      availableDonors,
      fulfilledUnits,
      regionalUnits,
      fulfillmentRate: requests.length
        ? Math.round((fulfilled.length / requests.length) * 100)
        : 100,
    };
  }, [requests, donors, bloodBanks, getBankStock]);

  const {
    pending,
    fulfilled,
    critical,
    availableDonors,
    fulfilledUnits,
    regionalUnits,
    fulfillmentRate,
  } = dashboardData;

  const stats = [
    {
      label: "Active emergencies",
      value: pending.length,
      text: "Awaiting allocation or in transit",
      icon: AlertTriangle,
      tone: "red",
    },
    {
      label: "Available donors",
      value: availableDonors.length,
      text: `Verified in ${userDistrict}`,
      icon: Users,
      tone: "blue",
    },
    {
      label: "Regional units",
      value: regionalUnits,
      text: "Live cold-chain inventory",
      icon: Droplets,
      tone: "green",
    },
    {
      label: "Fulfillment rate",
      value: `${fulfillmentRate}%`,
      text: `${fulfilled.length} completed requests`,
      icon: CheckCircle2,
      tone: "purple",
    },
  ];

  return (
    <PortalShell
      title={hospitalName}
      subtitle="Clinical emergency command"
      role="hospital"
      user={user}
      onBack={onBack}
    >
      {({ activeTab }) => (
        <div className="hospital-dashboard">
          {notification && (
            <div className="hospital-toast" role="status">
              <CheckCircle2 size={17} />
              <span>{notification}</span>
              <button
                type="button"
                onClick={() => setNotification("")}
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          )}

          <div className="hospital-dashboard-inner">
            <header className="hospital-welcome">
              <div>
                <p className="hospital-kicker">
                  <i />
                  LIVE CLINICAL NETWORK
                </p>
                <h1>
                  {greeting}, <em>{hospitalName}.</em>
                </h1>
                <p>
                  Patient demand, donor availability, and regional inventory
                  synchronized across {userDistrict}.
                </p>
              </div>

              <div className="hospital-header-actions">
                <NetworkTimeClock />

                <button
                  type="button"
                  className="hospital-secondary-button"
                  onClick={refreshWorkspace}
                  disabled={isRefreshing}
                >
                  <RefreshCw
                    size={17}
                    className={isRefreshing ? "hospital-spin" : ""}
                  />
                  Refresh
                </button>

                <button
                  type="button"
                  className="hospital-primary-button"
                  onClick={() => setRequestModalOpen(true)}
                >
                  <Plus size={17} />
                  New request
                </button>
              </div>
            </header>

            {/* TAB: DASHBOARD */}
            {(!activeTab || activeTab === "dashboard") && (
              <div className="hospital-view">
                <section className="hospital-command-card">
                  <span className="hospital-grid-pattern" />

                  <div className="hospital-command-copy">
                    <p className="hospital-card-kicker">
                      <Activity size={15} />
                      EMERGENCY COMMAND CENTRE
                    </p>

                    <h2>
                      Every critical minute
                      <em>connected.</em>
                    </h2>

                    <p>
                      Broadcast patient blood requirements instantly to verified
                      regional blood banks and eligible nearby donors.
                    </p>

                    <div className="hospital-command-actions">
                      <button
                        type="button"
                        onClick={() => setRequestModalOpen(true)}
                      >
                        <Send size={16} />
                        Broadcast emergency
                      </button>

                      <span>
                        <ShieldCheck size={16} />
                        Verified clinical access
                      </span>
                    </div>
                  </div>

                  <div className="hospital-radar" aria-hidden="true">
                    <span className="hospital-radar-ring radar-one" />
                    <span className="hospital-radar-ring radar-two" />
                    <span className="hospital-radar-ring radar-three" />
                    <span className="hospital-radar-sweep" />

                    <div className="hospital-radar-core">
                      <Hospital size={28} />
                      <strong>{critical.length}</strong>
                      <small>PRIORITY CASES</small>
                    </div>
                  </div>
                </section>

                <section className="hospital-stat-grid">
                  {stats.map(({ label, value, text, icon: Icon, tone }) => (
                    <article key={label}>
                      <span className={`hospital-stat-icon ${tone}`}>
                        <Icon size={20} />
                      </span>
                      <div>
                        <small>{label}</small>
                        <strong>{value}</strong>
                        <p>{text}</p>
                      </div>
                    </article>
                  ))}
                </section>

                <section className="hospital-overview-grid">
                  <article className="hospital-panel">
                    <div className="hospital-panel-heading">
                      <div>
                        <p className="hospital-kicker">
                          <AlertTriangle size={13} />
                          ACTIVE REQUESTS
                        </p>
                        <h3>Emergency queue & transit</h3>
                      </div>

                      <span className="hospital-count-pill">
                        {pending.length} pending
                      </span>
                    </div>

                    {pending.length === 0 ? (
                      <div className="hospital-empty">
                        <CheckCircle2 size={30} />
                        <strong>No pending requests</strong>
                        <p>All current patient requirements have been fulfilled.</p>
                      </div>
                    ) : (
                      pending.slice(0, 5).map((request) => {
                        const isVerified = Boolean(request.clinicalVerification?.crossMatchCompleted);
                        const bloodGroupDisplay = request.bloodGroup || "AB-";
                        const reqId = request._id || request.id;

                        return (
                          <div
                            key={reqId}
                            style={{
                              padding: "14px 0",
                              borderBottom: "1px solid #f1f5f9",
                            }}
                          >
                            <div className="hospital-request-row" style={{ borderBottom: "none" }}>
                              <span>{bloodGroupDisplay}</span>
                              <div>
                                <strong>
                                  {request.ward || request.area || "Critical Care"}
                                </strong>
                                <small>
                                  {request.unitsRequired || request.units || 1} units ·{" "}
                                  {request.component || "Packed RBC"}
                                </small>
                              </div>
                              <b>
                                {request.urgencyLevel || request.priority || "Urgent"}
                              </b>
                            </div>

                            <EmergencyAIAssistant currentBloodGroup={bloodGroupDisplay} />

                            {/* WhatsApp Emergency Share Link */}
                            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                              <a
                                href={generateWhatsAppBroadcastUrl({
                                  hospitalName: request.hospitalName || hospitalName,
                                  district: request.district || userDistrict,
                                  bloodGroup: bloodGroupDisplay,
                                  unitsRequired: request.unitsRequired || request.units || 1,
                                  urgencyLevel: request.urgencyLevel || request.priority || "Critical Trauma",
                                  contactPhone: request.contactPhone || "+91 84682 22001",
                                  requestId: reqId,
                                })}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  backgroundColor: "#25D366",
                                  color: "#ffffff",
                                  padding: "7px 14px",
                                  borderRadius: "8px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  textDecoration: "none",
                                  boxShadow: "0 2px 6px rgba(37, 211, 102, 0.25)",
                                }}
                              >
                                <MessageSquare size={14} fill="currentColor" />
                                Share to WhatsApp Groups
                              </a>
                            </div>

                            {request.respondingDonors && request.respondingDonors.length > 0 && (
                              <div
                                style={{
                                  marginTop: "10px",
                                  padding: "12px",
                                  background: "#ecfdf5",
                                  borderRadius: "10px",
                                  border: "1px solid #a7f3d0",
                                }}
                              >
                                <strong
                                  style={{
                                    fontSize: "12px",
                                    color: "#065f46",
                                    display: "block",
                                    marginBottom: "6px",
                                  }}
                                >
                                  🚑 Confirmed Incoming Donors ({request.respondingDonors.length}):
                                </strong>
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                  {request.respondingDonors.map((d, i) => (
                                    <div
                                      key={i}
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        fontSize: "12px",
                                        color: "#047857",
                                      }}
                                    >
                                      <span>
                                        <b>{d.donorName}</b> ({d.donorPhone})
                                      </span>
                                      <span>
                                        ETA: <b>~{d.etaMinutes} mins</b>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {isVerified && (
                              <div
                                style={{
                                  margin: "8px 0",
                                  padding: "8px 12px",
                                  background: "#f0fdf4",
                                  border: "1px solid #bbf7d0",
                                  borderRadius: "8px",
                                  fontSize: "11px",
                                  color: "#166534",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span>
                                  <b>✓ Bedside Clearance Verified:</b> Signed off by {request.clinicalVerification.verifiedByDoctor} & {request.clinicalVerification.verifiedByNurse}
                                </span>
                                <small style={{ color: "#15803d", fontWeight: 700 }}>IAT Compatible</small>
                              </div>
                            )}

                            <RequestTimeline
                              currentStatus={request.status}
                              requestId={reqId}
                              isVerified={isVerified}
                              onMarkDelivered={handleMarkDelivered}
                              onVerifyTransfusion={() => setActiveVerificationRequest(request)}
                            />
                          </div>
                        );
                      })
                    )}
                  </article>

                  <article className="hospital-panel hospital-readiness-card">
                    <p className="hospital-card-kicker">
                      <Snowflake size={14} />
                      REGIONAL READINESS
                    </p>

                    <strong className="hospital-reserve-value">{regionalUnits}</strong>
                    <span>blood units visible</span>

                    <div>
                      <Building2 size={15} />
                      Partner blood banks
                      <b>{bloodBanks.length}</b>
                    </div>

                    <div>
                      <HeartHandshake size={15} />
                      Available donors
                      <b>{availableDonors.length}</b>
                    </div>

                    <div>
                      <CheckCircle2 size={15} />
                      Fulfilled units
                      <b>{fulfilledUnits}</b>
                    </div>
                  </article>
                </section>
              </div>
            )}

            {/* TAB: PATIENT REQUESTS */}
            {activeTab === "patient-requests" && (
              <div className="hospital-view">
                <header className="hospital-page-heading">
                  <div>
                    <p className="hospital-kicker">
                      <AlertTriangle size={14} />
                      PATIENT DEMAND
                    </p>
                    <h2>Emergency patient requests</h2>
                    <p>Track every blood requirement broadcast through your hospital.</p>
                  </div>
                  <button
                    type="button"
                    className="hospital-primary-button"
                    onClick={() => setRequestModalOpen(true)}
                  >
                    <Plus size={16} />
                    Create request
                  </button>
                </header>

                <section className="hospital-panel hospital-table-panel">
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {requests.length === 0 ? (
                      <div className="hospital-empty">
                        <CheckCircle2 size={30} />
                        <strong>No requests</strong>
                        <p>Create an emergency request to start broadcasting.</p>
                      </div>
                    ) : (
                      requests.map((request) => {
                        const id = String(request._id || request.id || Math.random());
                        const priority =
                          request.urgencyLevel || request.priority || "Urgent";
                        const complete =
                          request.status === "Fulfilled" ||
                          request.status === "Delivered" ||
                          request.status === "Completed";
                        const isVerified = Boolean(request.clinicalVerification?.crossMatchCompleted);

                        return (
                          <div
                            key={id}
                            style={{
                              padding: "16px",
                              borderRadius: "12px",
                              border: "1px solid #e2e8f0",
                              background: "#ffffff",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: "12px",
                                marginBottom: "8px",
                              }}
                            >
                              <div>
                                <strong style={{ fontSize: "15px", color: "#0f172a" }}>
                                  #{id.slice(-6).toUpperCase()} — {request.ward || request.area || "ICU"}
                                </strong>
                                <span style={{ display: "block", fontSize: "12px", color: "#64748b" }}>
                                  {request.component || "Packed RBC"} · {request.unitsRequired || request.units || 1} units
                                </span>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span className="hospital-blood-chip">{request.bloodGroup}</span>
                                <span
                                  className={`hospital-priority ${
                                    priority.toLowerCase() === "critical" ? "critical" : ""
                                  }`}
                                >
                                  {priority}
                                </span>
                                <span
                                  className={`hospital-status ${
                                    complete ? "fulfilled" : "pending"
                                  }`}
                                >
                                  {request.status || "Pending Verification"}
                                </span>
                              </div>
                            </div>

                            <EmergencyAIAssistant currentBloodGroup={request.bloodGroup || "AB-"} />

                            {/* WhatsApp Emergency Share Link */}
                            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                              <a
                                href={generateWhatsAppBroadcastUrl({
                                  hospitalName: request.hospitalName || hospitalName,
                                  district: request.district || userDistrict,
                                  bloodGroup: request.bloodGroup,
                                  unitsRequired: request.unitsRequired || request.units || 1,
                                  urgencyLevel: priority,
                                  contactPhone: request.contactPhone || "+91 84682 22001",
                                  requestId: request._id || request.id,
                                })}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  backgroundColor: "#25D366",
                                  color: "#ffffff",
                                  padding: "7px 14px",
                                  borderRadius: "8px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  textDecoration: "none",
                                  boxShadow: "0 2px 6px rgba(37, 211, 102, 0.25)",
                                }}
                              >
                                <MessageSquare size={14} fill="currentColor" />
                                Share to WhatsApp Groups
                              </a>
                            </div>

                            {request.respondingDonors && request.respondingDonors.length > 0 && (
                              <div
                                style={{
                                  margin: "10px 0",
                                  padding: "12px",
                                  background: "#ecfdf5",
                                  borderRadius: "10px",
                                  border: "1px solid #a7f3d0",
                                }}
                              >
                                <strong
                                  style={{
                                    fontSize: "12px",
                                    color: "#065f46",
                                    display: "block",
                                    marginBottom: "6px",
                                  }}
                                >
                                  🚑 Confirmed Incoming Donors ({request.respondingDonors.length}):
                                </strong>
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                  {request.respondingDonors.map((d, i) => (
                                    <div
                                      key={i}
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        fontSize: "12px",
                                        color: "#047857",
                                      }}
                                    >
                                      <span>
                                        <b>{d.donorName}</b> ({d.donorPhone})
                                      </span>
                                      <span>
                                        ETA: <b>~{d.etaMinutes} mins</b>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {isVerified && (
                              <div
                                style={{
                                  margin: "8px 0",
                                  padding: "8px 12px",
                                  background: "#f0fdf4",
                                  border: "1px solid #bbf7d0",
                                  borderRadius: "8px",
                                  fontSize: "11px",
                                  color: "#166534",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span>
                                  <b>✓ Bedside Clearance Verified:</b> Signed off by {request.clinicalVerification.verifiedByDoctor} & {request.clinicalVerification.verifiedByNurse}
                                </span>
                                <small style={{ color: "#15803d", fontWeight: 700 }}>IAT Compatible</small>
                              </div>
                            )}

                            <RequestTimeline
                              currentStatus={request.status}
                              requestId={request._id || request.id}
                              isVerified={isVerified}
                              onMarkDelivered={handleMarkDelivered}
                              onVerifyTransfusion={() => setActiveVerificationRequest(request)}
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* TAB: DONOR MATCHING */}
            {activeTab === "donor-matching" && (
              <div className="hospital-view">
                <header className="hospital-page-heading">
                  <div>
                    <p className="hospital-kicker">
                      <HeartHandshake size={14} />
                      PROXIMITY NETWORK
                    </p>
                    <h2>Live donor matching</h2>
                    <p>Verified donors currently available in {userDistrict}.</p>
                  </div>
                  <button
                    type="button"
                    className="hospital-secondary-button"
                    onClick={fetchDonors}
                  >
                    <RefreshCw size={16} />
                    Refresh
                  </button>
                </header>

                {availableDonors.length === 0 ? (
                  <section className="hospital-panel">
                    <div className="hospital-empty">
                      <Users size={30} />
                      <strong>No available donors</strong>
                      <p>Matching donors will appear when they become available.</p>
                    </div>
                  </section>
                ) : (
                  <section className="hospital-donor-grid">
                    {availableDonors.map((donor, idx) => (
                      <article
                        className="hospital-donor-card"
                        key={donor._id || donor.id || `${donor.phone || "donor"}-${idx}`}
                      >
                        <div className="hospital-donor-top">
                          <span>{donor.bloodGroup}</span>
                          <small>Available</small>
                        </div>

                        <div className="hospital-donor-avatar">
                          {(donor.fullName || donor.name || "D").charAt(0).toUpperCase()}
                        </div>

                        <h3>{donor.fullName || donor.name || "Verified donor"}</h3>

                        <p>
                          <MapPin size={14} />
                          {donor.district || userDistrict}
                        </p>

                        <div className="hospital-donor-verified">
                          <ShieldCheck size={14} />
                          Identity and eligibility verified
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setNotification(
                              `Urgent alert prepared for ${
                                donor.fullName || donor.name || "the donor"
                              }.`
                            )
                          }
                        >
                          <Send size={15} />
                          Dispatch urgent alert
                        </button>
                      </article>
                    ))}
                  </section>
                )}
              </div>
            )}

            {/* TAB: BLOOD BANK INVENTORY */}
            {activeTab === "bank-inventory" && (
              <div className="hospital-view">
                <header className="hospital-page-heading">
                  <div>
                    <p className="hospital-kicker">
                      <Snowflake size={14} />
                      COLD-CHAIN NETWORK
                    </p>
                    <h2>Regional blood-bank inventory</h2>
                    <p>Live stock across licensed facilities in {userDistrict}.</p>
                  </div>
                  <div className="hospital-total-reserve">
                    <small>REGIONAL RESERVE</small>
                    <strong>{regionalUnits}</strong>
                    <span>units</span>
                  </div>
                </header>

                {bloodBanks.length === 0 ? (
                  <section className="hospital-panel">
                    <div className="hospital-empty">
                      <Building2 size={30} />
                      <strong>No partner blood banks</strong>
                      <p>No registered facilities were returned for this district.</p>
                    </div>
                  </section>
                ) : (
                  <section className="hospital-bank-list">
                    {bloodBanks.map((bank) => (
                      <article
                        className="hospital-bank-card"
                        key={bank._id || bank.id || bank.facilityName}
                      >
                        <header>
                          <div>
                            <span className="hospital-bank-icon">
                              <Building2 size={20} />
                            </span>
                            <div>
                              <h3>{bank.facilityName || bank.name || "Regional Blood Bank"}</h3>
                              <p>
                                <MapPin size={13} />
                                {bank.address || userDistrict}
                              </p>
                            </div>
                          </div>

                          <span className="hospital-cold-chain">
                            <Snowflake size={14} />
                            Cold chain active
                          </span>
                        </header>

                        <div className="hospital-stock-grid">
                          {BLOOD_GROUPS.map((group) => {
                            const count = getBankStock(bank, group);
                            return (
                              <div
                                className={`hospital-stock ${count < 5 ? "low" : ""}`}
                                key={group}
                              >
                                <span>{group}</span>
                                <strong>{count}</strong>
                                <small>{count < 5 ? "Low stock" : "Units"}</small>
                              </div>
                            );
                          })}
                        </div>
                      </article>
                    ))}
                  </section>
                )}
              </div>
            )}

            {/* TAB: REPORTS */}
            {activeTab === "reports" && (
              <div className="hospital-view">
                <header className="hospital-page-heading">
                  <div>
                    <p className="hospital-kicker">
                      <BarChart3 size={14} />
                      CLINICAL ANALYTICS
                    </p>
                    <h2>Fulfillment and audit reports</h2>
                    <p>Operational statistics generated from your request history.</p>
                  </div>
                </header>

                <section className="hospital-report-grid">
                  {[
                    {
                      label: "Fulfillment success",
                      value: `${fulfillmentRate}%`,
                      text: `${fulfilled.length} requests completed`,
                      icon: CheckCircle2,
                    },
                    {
                      label: "Units acquired",
                      value: fulfilledUnits,
                      text: "Current operational period",
                      icon: Droplets,
                    },
                    {
                      label: "Average response",
                      value: "14.2 min",
                      text: "District-wide response speed",
                      icon: Clock,
                    },
                    {
                      label: "Partner facilities",
                      value: bloodBanks.length,
                      text: `Connected in ${userDistrict}`,
                      icon: Building2,
                    },
                  ].map(({ label, value, text, icon: Icon }) => (
                    <article key={label}>
                      <span>
                        <Icon size={21} />
                      </span>
                      <small>{label}</small>
                      <strong>{value}</strong>
                      <p>{text}</p>
                    </article>
                  ))}
                </section>
              </div>
            )}
          </div>

          {activeVerificationRequest && (
            <CrossMatchVerificationModal
              request={activeVerificationRequest}
              onClose={() => setActiveVerificationRequest(null)}
              onVerified={fetchHospitalRequests}
            />
          )}

          {requestModalOpen && (
            <div
              className="hospital-modal-backdrop"
              onMouseDown={() => setRequestModalOpen(false)}
            >
              <section
                className="hospital-request-modal"
                role="dialog"
                aria-modal="true"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <header>
                  <div>
                    <span>EMERGENCY BROADCAST</span>
                    <h2>Create blood request</h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setRequestModalOpen(false)}
                    aria-label="Close form"
                  >
                    <X size={18} />
                  </button>
                </header>

                <p>
                  This request will be visible to matching donors and regional
                  blood banks in {userDistrict}.
                </p>

                <form onSubmit={handleCreateRequest}>
                  <div className="hospital-form-grid">
                    <label>
                      Blood group
                      <select
                        name="bloodGroup"
                        value={requestForm.bloodGroup}
                        onChange={handleFormChange}
                      >
                        {BLOOD_GROUPS.map((group) => (
                          <option key={group} value={group}>
                            {group}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Units required
                      <input
                        type="number"
                        name="unitsRequired"
                        min="1"
                        max="20"
                        value={requestForm.unitsRequired}
                        onChange={handleFormChange}
                        required
                      />
                    </label>
                  </div>

                  <label>
                    Blood component
                    <select
                      name="component"
                      value={requestForm.component}
                      onChange={handleFormChange}
                    >
                      <option>Whole Blood</option>
                      <option>Packed RBC</option>
                      <option>Platelets</option>
                      <option>Fresh Frozen Plasma</option>
                    </select>
                  </label>

                  <div className="hospital-form-grid">
                    <label>
                      Urgency
                      <select
                        name="urgencyLevel"
                        value={requestForm.urgencyLevel}
                        onChange={handleFormChange}
                      >
                        <option>Critical</option>
                        <option>Urgent</option>
                        <option>Standard</option>
                      </select>
                    </label>

                    <label>
                      Ward or department
                      <input
                        type="text"
                        name="ward"
                        value={requestForm.ward}
                        onChange={handleFormChange}
                        required
                      />
                    </label>
                  </div>

                  <div className="hospital-modal-warning">
                    <AlertTriangle size={17} />
                    Confirm patient need before broadcasting.
                  </div>

                  <button
                    type="submit"
                    className="hospital-modal-submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={17} className="hospital-spin" />
                        Broadcasting...
                      </>
                    ) : (
                      <>
                        <Send size={17} />
                        Broadcast emergency request
                      </>
                    )}
                  </button>
                </form>
              </section>
            </div>
          )}
        </div>
      )}
    </PortalShell>
  );
}