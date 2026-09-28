import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Award,
  BellRing,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Clock3,
  Droplets,
  Heart,
  HeartHandshake,
  HeartPulse,
  History,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

import PortalShell from "../../components/PortalShell";
import { getISTGreetingData } from "../../utils/istTime";
import { apiService } from "../../services/api";
import { API_BASE_URL } from "../../config";
import "./DonorDashboard.css";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getEligibilityStatus(lastDonatedDate) {
  if (!lastDonatedDate) {
    return { isEligible: true, daysRemaining: 0, message: "Ready to donate immediately" };
  }

  const lastDate = new Date(lastDonatedDate);
  const nextEligibleDate = new Date(lastDate.getTime() + 90 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const diffMs = nextEligibleDate - now;
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) {
    return { isEligible: true, daysRemaining: 0, message: "Eligible to donate" };
  }

  return {
    isEligible: false,
    daysRemaining,
    nextDate: nextEligibleDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    message: `Recovery period active. Eligible in ${daysRemaining} day(s)`,
  };
}

export function DonorEligibilityCard({ user }) {
  const status = getEligibilityStatus(user?.lastDonatedDate);

  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "16px",
        background: status.isEligible ? "#f0fdf4" : "#fffbeb",
        border: `1.5px solid ${status.isEligible ? "#bbf7d0" : "#fde68a"}`,
        marginBottom: "20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "12px",
            background: status.isEligible ? "#16a34a" : "#d97706",
            color: "#fff",
            display: "grid",
            placeItems: "center",
          }}
        >
          {status.isEligible ? <ShieldCheck size={24} /> : <Clock size={24} />}
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: "16px", color: "#1e293b" }}>
            Medical Donation Status:{" "}
            <span style={{ color: status.isEligible ? "#16a34a" : "#d97706" }}>
              {status.isEligible ? "Eligible" : "Cooldown Active"}
            </span>
          </h4>
          <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#64748b" }}>
            {status.isEligible
              ? "You meet the 90-day clinical recovery window and can respond to emergency dispatches."
              : `Next recommended donation date: ${status.nextDate} (${status.daysRemaining} days remaining).`}
          </p>
        </div>
      </div>

      <div style={{ textAlign: "right" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            fontWeight: 700,
            padding: "6px 14px",
            borderRadius: "99px",
            background: status.isEligible ? "#dcfce7" : "#fef3c7",
            color: status.isEligible ? "#15803d" : "#b45309",
          }}
        >
          <Heart size={13} fill="currentColor" />
          {user?.totalDonationsCount || 0} Total Lifetime Donations
        </span>
      </div>
    </div>
  );
}

export function PushNotificationBanner({ user }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) setIsSubscribed(true);
        });
      });
    }
  }, []);

  const enableNotifications = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Notification permission was declined.");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const keyRes = await fetch(`${API_BASE_URL}/api/push/vapid-key`);
      const { publicKey } = await keyRes.json();

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch(`${API_BASE_URL}/api/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription,
          userId: user?._id || user?.id,
          role: user?.role || "donor",
          district: user?.district || "Kamareddy",
          bloodGroup: user?.bloodGroup || "O+",
        }),
      });

      setIsSubscribed(true);
      alert("🔔 Emergency phone alerts enabled successfully! (100% free)");
    } catch (err) {
      console.error("Subscription failed:", err);
      alert("Failed to register push notifications.");
    } finally {
      setLoading(false);
    }
  };

  if (isSubscribed) return null;

  return (
    <div
      style={{
        padding: "12px 18px",
        backgroundColor: "#fef2f2",
        border: "1px solid #fee2e2",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "16px",
        gap: "10px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <BellRing size={18} color="#dc2626" />
        <span style={{ fontSize: "13px", color: "#991b1b", fontWeight: 600 }}>
          Enable instant emergency notifications on your phone or desktop
        </span>
      </div>
      <button
        onClick={enableNotifications}
        disabled={loading}
        style={{
          padding: "6px 14px",
          background: "#dc2626",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Enabling..." : "Enable Alerts"}
      </button>
    </div>
  );
}

export function EmergencyAlertCard({ alert: item, currentUser, onResponseSuccess }) {
  const [eta, setEta] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [responded, setResponded] = useState(
    item.respondingDonors?.some(
      (d) => d.donorPhone === (currentUser?.phone || "")
    )
  );

  const eligibility = getEligibilityStatus(currentUser?.lastDonatedDate);
  const cardId = item._id || item.id;

  const handleRespond = async () => {
    if (!eligibility.isEligible) {
      alert(`⚠️ You are currently in the 90-day cooldown recovery window. Next eligible date: ${eligibility.nextDate}`);
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("vital_token");
      const res = await fetch(
        `${API_BASE_URL}/api/blood-requests/${cardId}/respond`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            donorId: currentUser?._id || currentUser?.id,
            donorName: currentUser?.name || currentUser?.fullName || "Verified Donor",
            donorPhone: currentUser?.phone || "+91 98765 43210",
            etaMinutes: eta,
          }),
        }
      );

      const data = await res.json();
      if (data.success) {
        alert(`✅ ${data.message}`);
        setResponded(true);
        if (onResponseSuccess) onResponseSuccess();
      } else {
        alert(`⚠️ ${data.message}`);
      }
    } catch (err) {
      console.error("Response error:", err);
      alert("Failed to transmit confirmation to hospital.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id={`request-${cardId}`}
      className="emergency-card"
      style={{
        padding: "18px",
        borderRadius: "14px",
        border: "1.5px solid #fee2e2",
        background: "#fff",
        boxShadow: "0 4px 12px rgba(220, 38, 38, 0.05)",
        marginBottom: "14px",
        transition: "all 0.35s ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span
            style={{
              display: "inline-block",
              background: "#ef4444",
              color: "#ffffff",
              fontSize: "11px",
              fontWeight: 800,
              padding: "2px 8px",
              borderRadius: "99px",
              textTransform: "uppercase",
              marginBottom: "6px",
            }}
          >
            {item.level || item.urgencyLevel || "Critical Trauma"}
          </span>
          <h4 style={{ margin: "0 0 4px", fontSize: "16px", color: "#0f172a" }}>
            {item.facility || item.hospitalName}
          </h4>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
            📍 {item.area || item.district} · Needs <b>{item.units || item.unitsRequired} Unit(s)</b> of{" "}
            <b style={{ color: "#dc2626" }}>{item.group || item.bloodGroup}</b>
          </p>
        </div>

        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: "12px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}>
            <Clock size={13} /> {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Live"}
          </span>
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: "14px 0" }} />

      {responded ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#16a34a",
            fontSize: "13px",
            fontWeight: 700,
            background: "#f0fdf4",
            padding: "10px 14px",
            borderRadius: "10px",
          }}
        >
          <CheckCircle2 size={16} />
          You confirmed response! The emergency trauma bay is awaiting your arrival.
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "#475569", fontWeight: 600 }}>Estimated Arrival:</span>
            <select
              value={eta}
              onChange={(e) => setEta(e.target.value)}
              disabled={!eligibility.isEligible}
              style={{
                padding: "6px 10px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "12px",
                background: "#fff",
              }}
            >
              <option value={15}>15 mins</option>
              <option value={30}>30 mins</option>
              <option value={45}>45 mins</option>
              <option value={60}>1 hour</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleRespond}
            disabled={submitting || !eligibility.isEligible}
            style={{
              padding: "8px 18px",
              backgroundColor: eligibility.isEligible ? "#dc2626" : "#94a3b8",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: submitting || !eligibility.isEligible ? "not-allowed" : "pointer",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting
              ? "Confirming..."
              : eligibility.isEligible
              ? "I Can Donate Now →"
              : "Cooldown Active"}
          </button>
        </div>
      )}
    </div>
  );
}

const INITIAL_CHECKLIST = [
  { id: 1, label: "Drink 2–3 glasses of water", done: true },
  { id: 2, label: "Eat an iron-rich meal", done: true },
  { id: 3, label: "Sleep for at least seven hours", done: false },
  { id: 4, label: "Bring a valid photo ID", done: false },
];

const DONATION_HISTORY = [
  {
    id: "DON-1028",
    facility: "LifeLine Blood Centre",
    date: "14 June 2026",
    group: "O+",
    units: 1,
    status: "Completed",
  },
  {
    id: "DON-0874",
    facility: "CityCare Hospital",
    date: "02 March 2026",
    group: "O+",
    units: 1,
    status: "Completed",
  },
  {
    id: "DON-0612",
    facility: "Regional Medical Centre",
    date: "28 November 2025",
    group: "O+",
    units: 1,
    status: "Completed",
  },
];

export default function DonorDashboard({ user, onBack }) {
  const currentDonor =
    user || JSON.parse(localStorage.getItem("vital_user") || "{}");

  const donorName =
    currentDonor?.name ||
    currentDonor?.email?.split("@")[0] ||
    "Donor";

  const donorBloodType = currentDonor?.bloodGroup || "O+";

  const initialTime = useMemo(() => getISTGreetingData(), []);
  const greeting = initialTime.greeting;

  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const targetRequestId = searchParams.get("request");

  const [requests, setRequests] = useState([]);
  const [upcomingCamps, setUpcomingCamps] = useState([]);
  const [registeredCampId, setRegisteredCampId] = useState(null);
  const [checklist, setChecklist] = useState(INITIAL_CHECKLIST);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [appointmentConfirmed, setAppointmentConfirmed] = useState(false);
  const [message, setMessage] = useState("");

  const loadMatchingRequests = useCallback(
    async ({ showLoader = false } = {}) => {
      if (showLoader) setIsLoading(true);

      try {
        const token = localStorage.getItem("vital_token");

        const response = await fetch(`${API_BASE_URL}/api/requests`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (response.status === 403) {
          const errorData = await response.json().catch(() => ({}));
          localStorage.removeItem("vital_token");
          localStorage.removeItem("vital_user");
          window.alert(
            `Access revoked: ${
              errorData.message ||
              "Your donor account has been suspended by an administrator."
            }`
          );
          if (typeof onBack === "function") onBack();
          else window.location.href = "/";
          return;
        }

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (data.success && Array.isArray(data.requests)) {
          const formattedRequests = data.requests.map((item, index) => {
            const urgency = item.urgencyLevel || "High need";
            const isCritical = urgency.toLowerCase().includes("crit");

            return {
              id: item._id || item.id || index + 1,
              _id: item._id || item.id,
              group: item.bloodGroup || donorBloodType,
              level: urgency,
              facility: item.hospitalName || "Partner Hospital",
              area: item.district || "Central Medical Ward",
              distance: item.distance || `${(3.2 + index * 1.5).toFixed(1)} km`,
              units: Number(item.unitsRequired || item.units || 1),
              eta: item.eta || `${10 + index * 4} min`,
              patientCondition: item.patientCondition || "Emergency support required",
              tone: isCritical ? "critical" : "urgent",
              respondingDonors: item.respondingDonors || [],
              createdAt: item.createdAt,
            };
          });

          setRequests(formattedRequests);
        }

        setLastUpdated(new Date());
      } catch (error) {
        console.error("Failed to load donor requests:", error);
        if (showLoader) {
          setMessage("Unable to reach the live request network. Please try again.");
        }
      } finally {
        if (showLoader) setIsLoading(false);
      }
    },
    [donorBloodType, onBack]
  );

  const fetchUpcomingCamps = useCallback(async () => {
    try {
      const district = currentDonor.district || "Kamareddy";
      const res = await fetch(
        `${API_BASE_URL}/api/camps?district=${district}&status=Medically Verified`
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.camps)) {
        setUpcomingCamps(data.camps);
      }
    } catch (err) {
      console.warn("Could not load camps:", err.message);
    }
  }, [currentDonor.district]);

  useEffect(() => {
    loadMatchingRequests({ showLoader: true });
    fetchUpcomingCamps();

    const requestTimer = window.setInterval(() => {
      loadMatchingRequests({ showLoader: false });
      fetchUpcomingCamps();
    }, 10000);

    return () => window.clearInterval(requestTimer);
  }, [loadMatchingRequests, fetchUpcomingCamps]);

  useEffect(() => {
    if (targetRequestId && requests.length > 0) {
      const el = document.getElementById(`request-${targetRequestId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.style.border = "2px solid #dc2626";
        el.style.boxShadow = "0 0 18px rgba(220, 38, 38, 0.4)";
      }
    }
  }, [targetRequestId, requests]);

  const completedChecklistItems = checklist.filter((item) => item.done).length;
  const readiness = Math.round((completedChecklistItems / checklist.length) * 100);
  const criticalRequests = requests.filter((r) => r.tone === "critical").length;

  const formattedUpdateTime = lastUpdated.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const toggleChecklist = (itemId) => {
    setChecklist((previous) =>
      previous.map((item) =>
        item.id === itemId ? { ...item, done: !item.done } : item
      )
    );
  };

  const RequestList = () => (
    <section className="donor-panel donor-request-panel">
      <div className="donor-panel-heading donor-request-heading">
        <div>
          <p className="donor-kicker">
            <Zap size={14} />
            Real-time emergency queue
          </p>
          <h3>Urgent requests matching {donorBloodType}</h3>
          <p className="donor-panel-description">
            Respond instantly and notify the receiving trauma team of your ETA.
          </p>
        </div>

        <button
          type="button"
          className="donor-refresh-small"
          onClick={() => loadMatchingRequests({ showLoader: true })}
          disabled={isLoading}
        >
          <RefreshCw size={14} />
          <span>{isLoading ? "Checking" : formattedUpdateTime}</span>
        </button>
      </div>

      {isLoading ? (
        <div className="donor-empty">
          <Loader2 size={28} className="donor-spin" />
          <strong>Finding verified requests</strong>
          <p>Checking the live network near your registered location.</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="donor-empty">
          <CheckCircle2 size={30} />
          <strong>No matching emergencies</strong>
          <p>You will be notified when a verified request matches your blood group.</p>
        </div>
      ) : (
        <div style={{ marginTop: "16px" }}>
          {requests.map((request) => (
            <EmergencyAlertCard
              key={request.id}
              alert={request}
              currentUser={currentDonor}
              onResponseSuccess={() => loadMatchingRequests({ showLoader: false })}
            />
          ))}
        </div>
      )}
    </section>
  );

  const RegionalCampsSection = () => (
    <section className="donor-panel" style={{ marginTop: "20px" }}>
      <div className="donor-panel-heading">
        <div>
          <p className="donor-kicker">REGIONAL BLOOD DRIVES</p>
          <h3>Upcoming Camps in {currentDonor.district || "Kamareddy"}</h3>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "16px",
        }}
      >
        {upcomingCamps.length === 0 ? (
          <div className="donor-empty" style={{ gridColumn: "1 / -1" }}>
            <CheckCircle2 size={24} />
            <strong>No active drives in your area</strong>
            <p>New donation camps will be listed once verified by health authorities.</p>
          </div>
        ) : (
          upcomingCamps.map((camp) => {
            const campId = camp._id || camp.id;
            const isRegistered = registeredCampId === campId;
            return (
              <article
                className="donor-appointment-card"
                key={campId}
                style={{ display: "block" }}
              >
                <span className="donor-kicker" style={{ color: "var(--donor-green)" }}>
                  ● {camp.status}
                </span>
                <h3 style={{ margin: "8px 0 4px" }}>{camp.campName}</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--donor-muted)" }}>
                  <strong>Organizer:</strong> {camp.organizer}
                </p>
                <p style={{ margin: "4px 0", fontSize: "12px", color: "var(--donor-muted)" }}>
                  <strong>Venue:</strong> {camp.venue}
                </p>
                <p style={{ margin: "4px 0 14px", fontSize: "12px", color: "var(--donor-muted)" }}>
                  <strong>Date:</strong>{" "}
                  {new Date(camp.preferredDate).toLocaleDateString("en-IN", {
                    dateStyle: "medium",
                  })}
                </p>

                <button
                  type="button"
                  className={isRegistered ? "confirmed" : ""}
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => {
                    setRegisteredCampId(campId);
                    setMessage(`You are registered for ${camp.campName}!`);
                  }}
                >
                  {isRegistered ? "✓ Registered" : "Join Blood Drive"}
                </button>
              </article>
            );
          })
        )}
      </div>
    </section>
  );

  const ProfileView = () => (
    <div className="donor-view">
      <PushNotificationBanner user={currentDonor} />
      <DonorEligibilityCard user={currentDonor} />

      <section className="donor-hero-grid">
        <article className="donor-command-card">
          <div className="donor-command-copy">
            <p className="donor-kicker">
              <Sparkles size={14} />
              Your next impact
            </p>

            <h2>
              One donation.
              <em>Three lives protected.</em>
            </h2>

            <p>
              VitalConnectAI is matching your <strong>{donorBloodType}</strong> blood type with verified emergency requests near you.
            </p>

            <div className="donor-command-actions">
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("donor-live-requests")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Explore live requests
                <ChevronRight size={17} />
              </button>

              <span>
                <ShieldCheck size={16} />
                Identity verified
              </span>
            </div>
          </div>

          <div className="donor-blood-visual">
            <div>
              <Droplets size={34} />
              <strong>{donorBloodType}</strong>
              <small>Your type</small>
            </div>
          </div>
        </article>

        <article className="donor-readiness-card">
          <div className="donor-panel-heading">
            <div>
              <p className="donor-kicker">Donation readiness</p>
              <h3>Eligibility status</h3>
            </div>

            <span className="donor-heading-icon">
              <HeartPulse size={20} />
            </span>
          </div>

          <div className="donor-progress" style={{ "--readiness": `${readiness}%` }}>
            <div>
              <strong>{readiness}%</strong>
              <span>Ready</span>
            </div>
          </div>

          <p>Complete your preparation checklist before responding to an urgent request.</p>

          <div className="donor-readiness-meta">
            <span>
              <CalendarDays size={15} />
              Eligible now
            </span>

            <span>
              <CheckCircle2 size={15} />
              Screening passed
            </span>
          </div>
        </article>
      </section>

      <section className="donor-stat-grid">
        {[
          {
            label: "Lives impacted",
            value: "09",
            text: "Three donations completed",
            icon: HeartHandshake,
            tone: "red",
          },
          {
            label: "Impact points",
            value: "1,240",
            text: "Top 8% in your community",
            icon: Award,
            tone: "gold",
          },
          {
            label: "Community rank",
            value: "#48",
            text: "Up 12 places this month",
            icon: Users,
            tone: "blue",
          },
          {
            label: "Urgent matches",
            value: criticalRequests,
            text: "Live verified requests",
            icon: Activity,
            tone: "green",
          },
        ].map(({ label, value, text, icon: Icon, tone }) => (
          <article key={label}>
            <span className={`donor-stat-icon ${tone}`}>
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

      <section className="donor-content-grid donor-content-full" id="donor-live-requests">
        <RequestList />
      </section>

      <RegionalCampsSection />

      <aside className="donor-checklist-drawer" aria-label="Donation preparation checklist">
        <button type="button" className="donor-checklist-trigger" aria-label="Open donation checklist">
          <CheckCircle2 size={20} />
          <span>Donation checklist</span>
          <strong>{readiness}%</strong>
        </button>

        <div className="donor-checklist-drawer-panel">
          <div className="donor-drawer-heading">
            <div>
              <p className="donor-kicker">
                <HeartPulse size={14} />
                Preparation
              </p>
              <h3>Donation checklist</h3>
              <p>Complete these steps before responding to an urgent blood request.</p>
            </div>
            <strong className="donor-drawer-percentage">{readiness}%</strong>
          </div>

          <div className="donor-checklist-progress">
            <span style={{ width: `${readiness}%` }} />
          </div>

          <div className="donor-checklist">
            {checklist.map((item) => (
              <button
                type="button"
                key={item.id}
                className={item.done ? "done" : ""}
                onClick={() => toggleChecklist(item.id)}
              >
                <span>{item.done && <Check size={13} />}</span>
                <strong>{item.label}</strong>
              </button>
            ))}
          </div>

          <div className="donor-drawer-footer">
            <ShieldCheck size={17} />
            <div>
              <strong>Preparation status</strong>
              <span>
                {readiness === 100
                  ? "You are ready to donate."
                  : `${checklist.length - completedChecklistItems} items remaining.`}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );

  const DonateView = () => (
    <div className="donor-view">
      <PushNotificationBanner user={currentDonor} />
      <DonorEligibilityCard user={currentDonor} />

      <header className="donor-page-heading">
        <p className="donor-kicker">
          <HeartHandshake size={14} />
          Respond now
        </p>
        <h2>Donate blood</h2>
        <p>Select a verified request and notify the hospital about your availability.</p>
      </header>
      <RequestList />
      <RegionalCampsSection />
    </div>
  );

  const HistoryView = () => (
    <div className="donor-view">
      <header className="donor-page-heading">
        <p className="donor-kicker">
          <History size={14} />
          Donation record
        </p>
        <h2>Donation history</h2>
        <p>Your completed donations and recorded community impact.</p>
      </header>

      <section className="donor-panel">
        <div className="donor-table-scroll">
          <table className="donor-table">
            <thead>
              <tr>
                <th>Donation ID</th>
                <th>Facility</th>
                <th>Date</th>
                <th>Blood group</th>
                <th>Units</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {DONATION_HISTORY.map((donation) => (
                <tr key={donation.id}>
                  <td>
                    <strong>{donation.id}</strong>
                  </td>
                  <td>{donation.facility}</td>
                  <td>{donation.date}</td>
                  <td>
                    <span className="donor-history-group">{donorBloodType || donation.group}</span>
                  </td>
                  <td>{donation.units}</td>
                  <td>
                    <span className="donor-history-status">
                      <CheckCircle2 size={14} />
                      {donation.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );

  const AppointmentView = () => (
    <div className="donor-view">
      <header className="donor-page-heading">
        <p className="donor-kicker">
          <CalendarDays size={14} />
          Donation appointment
        </p>
        <h2>Confirm your visit</h2>
        <p>Review your next scheduled donation appointment.</p>
      </header>

      <section className="donor-appointment-card">
        <div className="donor-appointment-date">
          <span>SEP</span>
          <strong>16</strong>
          <small>Wednesday</small>
        </div>

        <div className="donor-appointment-details">
          <p className="donor-kicker">Next appointment</p>
          <h3>LifeLine Blood Centre</h3>
          <p>
            <Clock3 size={14} />
            10:30 AM – 11:15 AM
          </p>
          <p>
            <MapPin size={14} />
            Banjara Hills, Hyderabad
          </p>
        </div>

        <button
          type="button"
          className={appointmentConfirmed ? "confirmed" : ""}
          onClick={() => setAppointmentConfirmed((value) => !value)}
        >
          {appointmentConfirmed ? (
            <>
              <Check size={16} />
              Confirmed
            </>
          ) : (
            <>
              Confirm visit
              <ChevronRight size={16} />
            </>
          )}
        </button>
      </section>

      <RegionalCampsSection />
    </div>
  );

  const renderView = (activeTab) => {
    if (!activeTab || activeTab === "profile") return <ProfileView />;
    if (activeTab === "requests") return <DonateView />;
    if (activeTab === "donate") return <AppointmentView />;
    if (activeTab === "history") return <HistoryView />;
    return <ProfileView />;
  };

  return (
    <PortalShell
      title="Donor Portal"
      subtitle="Your kindness, made visible."
      role="donor"
      user={currentDonor}
      icon={HeartHandshake}
      onBack={onBack}
    >
      {({ activeTab }) => (
        <div className="donor-dashboard">
          {message && (
            <div className="donor-message" role="status">
              <CheckCircle2 size={17} />
              <span>{message}</span>
              <button
                type="button"
                onClick={() => setMessage("")}
                aria-label="Dismiss message"
              >
                ×
              </button>
            </div>
          )}

          <div className="donor-dashboard-inner">
            <header className="donor-welcome">
              <div>
                <p className="donor-kicker">
                  <i />
                  Live donor network
                </p>
                <h1>
                  {greeting}, <em>{donorName}.</em>
                </h1>
                <p>
                  Your next act of kindness is closer than you think. Everything you need is synchronized in real time.
                </p>
              </div>

              <div className="donor-network-status">
                <ShieldCheck size={18} />
                <div>
                  <span>Network status</span>
                  <strong>Connected</strong>
                </div>
              </div>
            </header>

            {renderView(activeTab)}
          </div>
        </div>
      )}
    </PortalShell>
  );
}