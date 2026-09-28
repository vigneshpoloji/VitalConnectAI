import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Droplets,
  HeartHandshake,
  Loader2,
  MessageSquare,
  PackageCheck,
  PlusCircle,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Snowflake,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import PortalShell from "../../components/PortalShell";
import { getISTGreetingData } from "../../utils/istTime";
import { apiService } from "../../services/api";
import { generateWhatsAppBroadcastUrl } from "../../utils/whatsappBroadcast";
import { API_BASE_URL } from "../../config";
import "./BloodBankDashboard.css";

const BLOOD_GROUPS = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

const EMPTY_STOCK = {
  "O+": 0,
  "O-": 0,
  "A+": 0,
  "A-": 0,
  "B+": 0,
  "B-": 0,
  "AB+": 0,
  "AB-": 0,
};

function normalizeStock(stockUnits = {}) {
  const formatted = {};

  BLOOD_GROUPS.forEach((group) => {
    const asciiGroup = group.replace("−", "-");
    const unicodeGroup = group.replace("-", "−");

    formatted[asciiGroup] = Number(
      stockUnits[asciiGroup] ?? stockUnits[unicodeGroup] ?? 0
    );
  });

  return formatted;
}

export function ColdChainBatchManager({ bloodBankId, onBatchUpdate }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBatches = useCallback(async () => {
    if (!bloodBankId) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/inventory/batches/${bloodBankId}`
      );
      const data = await res.json();
      if (data.success) {
        setBatches(data.batches || []);
      }
    } catch (err) {
      console.warn("Batch fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [bloodBankId]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const handleDiscard = async (batchId) => {
    if (
      !window.confirm(
        "Log this batch as discarded? Units will be deducted from active inventory."
      )
    )
      return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/inventory/batches/${batchId}/discard`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: "Routine cold-chain protocol expiration",
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        alert("Batch discarded and removed from search availability.");
        fetchBatches();
        if (typeof onBatchUpdate === "function") {
          onBatchUpdate();
        }
      } else {
        alert(`⚠️ ${data.message || "Failed to discard batch."}`);
      }
    } catch (e) {
      alert("Failed to discard batch.");
    }
  };

  return (
    <div
      style={{
        marginTop: "24px",
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "16px",
        padding: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "17px",
              color: "#0f172a",
              fontWeight: 700,
            }}
          >
            Cold-Chain Shelf Life & Expiration Ledger
          </h3>
          <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#64748b" }}>
            Track days to expiry to prevent spoiled units from entering the
            transfusion line.
          </p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "#94a3b8", fontSize: "13px" }}>
          Loading batch records...
        </p>
      ) : batches.length === 0 ? (
        <p style={{ color: "#94a3b8", fontSize: "13px" }}>
          No active storage batches recorded.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {batches.map((b) => {
            const isCritical = b.status === "Expired";
            const isWarning = b.status === "Expiring Soon";

            return (
              <div
                key={b._id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: isCritical
                    ? "#fef2f2"
                    : isWarning
                    ? "#fffbeb"
                    : "#f8fafc",
                  border: `1px solid ${
                    isCritical
                      ? "#fecaca"
                      : isWarning
                      ? "#fde68a"
                      : "#e2e8f0"
                  }`,
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: "15px",
                        color: "#0f172a",
                      }}
                    >
                      {b.bloodGroup}
                    </span>
                    <span style={{ fontSize: "12px", color: "#475569" }}>
                      ({b.unitsCount} Units · {b.componentType})
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "99px",
                        background: isCritical
                          ? "#ef4444"
                          : isWarning
                          ? "#d97706"
                          : "#16a34a",
                        color: "#fff",
                      }}
                    >
                      {b.status}
                    </span>
                  </div>
                  <small
                    style={{
                      color: "#64748b",
                      fontSize: "11px",
                      display: "block",
                      marginTop: "2px",
                    }}
                  >
                    Expiry Date: {new Date(b.expiryDate).toLocaleDateString()} |
                    Location: {b.storageLocation}
                  </small>
                </div>

                {(isCritical || isWarning) && (
                  <button
                    type="button"
                    onClick={() => handleDiscard(b._id)}
                    style={{
                      padding: "6px 12px",
                      background: "#dc2626",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Trash2 size={13} /> Discard Batch
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BloodBankDashboard({ user, onBack }) {
  const currentUser =
    user || JSON.parse(localStorage.getItem("vital_user") || "{}");

  const bloodBankName =
    currentUser?.name ||
    currentUser?.facilityName ||
    "LifeLine Blood Centre";

  const [{ greeting, istTimeStr }, setIstData] = useState(getISTGreetingData);

  const [stock, setStock] = useState(EMPTY_STOCK);
  const [requests, setRequests] = useState([]);
  const [activity, setActivity] = useState([]);
  const [filter, setFilter] = useState("All");
  const [dispatchingId, setDispatchingId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingInventory, setIsSavingInventory] = useState(false);
  const [updatingGroup, setUpdatingGroup] = useState(null);
  const [message, setMessage] = useState("");

  const pushActivity = useCallback((title, detail) => {
    const time = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    setActivity((previous) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title,
          detail,
          time,
        },
        ...previous,
      ].slice(0, 6)
    );
  }, []);

  const loadStock = useCallback(async () => {
    const token = localStorage.getItem("vital_token");
    if (!token) return;

    try {
      let response = await fetch(`${API_BASE_URL}/api/bloodbanks/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 403) {
        const errData = await response.json().catch(() => ({}));
        localStorage.removeItem("vital_token");
        localStorage.removeItem("vital_user");
        alert(
          `⚠️ Access Revoked: ${
            errData.message ||
            "Your account has been suspended by an Administrator."
          }`
        );
        if (typeof onBack === "function") onBack();
        else window.location.href = "/";
        return;
      }

      let data = await response.json();

      if (!data.success || !data.stockUnits) {
        const district = currentUser.district || "Kamareddy";

        response = await fetch(
          `${API_BASE_URL}/api/bloodbanks/inventory?district=${district}`
        );

        data = await response.json();

        if (data.success && data.banks?.length) {
          const matchingBank =
            data.banks.find(
              (bank) =>
                bank._id === currentUser.id ||
                bank._id === currentUser._id
            ) || data.banks[0];

          data.stockUnits = matchingBank?.stockUnits;
        }
      }

      if (data.stockUnits) {
        setStock(normalizeStock(data.stockUnits));
      }
    } catch (error) {
      console.error("Failed to load blood-bank inventory:", error);
    }
  }, [currentUser.district, currentUser.id, currentUser._id, onBack]);

  const loadRequests = useCallback(async () => {
    try {
      const response = await apiService.getBloodRequests();

      if (response.success && Array.isArray(response.requests)) {
        setRequests(
          response.requests.map((request) => ({
            id: request._id || request.id,
            hospital: request.hospitalName || "Emergency Trauma Wing",
            group: (request.bloodGroup || "O+").replace("−", "-"),
            units: Number(request.unitsRequired || request.units || 1),
            priority: request.urgencyLevel || "Urgent",
            district: request.district || currentUser.district || "Kamareddy",
            contactPhone: request.contactPhone || "+91 84682 22001",
            status:
              request.status === "Fulfilled" || request.status === "Dispatched"
                ? "Dispatched"
                : "Pending",
            ward: request.ward || request.area || "Critical Care",
          }))
        );
      }
    } catch (error) {
      console.error("Failed to load hospital requests:", error);
    }
  }, [currentUser.district]);

  const refreshWorkspace = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([loadStock(), loadRequests()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadStock, loadRequests]);

  useEffect(() => {
    refreshWorkspace();
    pushActivity("Network connected", "Cold-chain stream synchronized.");

    const clockTimer = window.setInterval(() => {
      setIstData(getISTGreetingData());
    }, 1000);

    const refreshTimer = window.setInterval(() => {
      loadStock();
      loadRequests();
    }, 4000);

    return () => {
      window.clearInterval(clockTimer);
      window.clearInterval(refreshTimer);
    };
  }, [refreshWorkspace, loadStock, loadRequests, pushActivity]);

  const handleDispatchUnits = async (requestId, bloodGroup, unitsNeeded) => {
    const confirmDispatch = window.confirm(
      `Confirm dispatch of ${unitsNeeded} unit(s) of ${bloodGroup} to the requesting hospital?`
    );
    if (!confirmDispatch) return;

    setDispatchingId(requestId);

    try {
      const token = localStorage.getItem("vital_token");
      const res = await fetch(
        `${API_BASE_URL}/api/blood-requests/${requestId}/dispatch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            bloodBankId: currentUser?._id || currentUser?.id,
            dispatchedUnits: unitsNeeded,
          }),
        }
      );

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const errText = await res.text();
        console.error("Server returned non-JSON response:", errText);
        alert(
          "Endpoint error or route not found (404/500). Verify backend route configuration."
        );
        return;
      }

      const data = await res.json();
      if (data.success) {
        setMessage(`✅ ${data.message}`);
        pushActivity(
          "Stock Dispatched & Synced",
          `${unitsNeeded} units of ${bloodGroup} dispatched.`
        );

        if (data.remainingStock !== undefined) {
          const cleanGroup = bloodGroup.replace("−", "-");
          setStock((prev) => ({
            ...prev,
            [cleanGroup]: data.remainingStock,
          }));
        }

        await Promise.all([loadStock(), loadRequests()]);
      } else {
        setMessage(`⚠️ ${data.message || "Dispatch failed."}`);
        alert(`⚠️ ${data.message || "Dispatch failed."}`);
      }
    } catch (err) {
      console.error("Dispatch failed:", err);
      alert("Failed to connect to backend server.");
    } finally {
      setDispatchingId(null);
    }
  };

  const adjustStock = async (group, delta) => {
    const token = localStorage.getItem("vital_token");
    const normalizedKey = group.replace("−", "-");
    const currentUnits = stock[normalizedKey] || 0;

    if (delta < 0 && currentUnits <= 0) return;

    const optimisticCount = Math.max(0, currentUnits + delta);

    setStock((previous) => ({
      ...previous,
      [normalizedKey]: optimisticCount,
    }));

    setUpdatingGroup(normalizedKey);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/bloodbanks/inventory/update`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            bloodGroup: normalizedKey,
            deltaUnits: delta,
          }),
        }
      );

      const data = await response.json();

      if (data.success && data.stockUnits) {
        setStock(normalizeStock(data.stockUnits));
        pushActivity(
          delta > 0 ? "Inventory Intake" : "Inventory Deduction",
          `${group} inventory updated to ${data.units} units in MongoDB.`
        );
      } else {
        loadStock();
      }
    } catch (err) {
      console.error("Failed to update inventory in database:", err);
      loadStock();
    } finally {
      setUpdatingGroup(null);
    }
  };

  const saveInventoryToMongoDB = async () => {
    const token = localStorage.getItem("vital_token");
    if (!token) return;

    setIsSavingInventory(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/bloodbanks/inventory/save`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ stockUnits: stock }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setStock(normalizeStock(data.stockUnits || stock));
        setMessage("Inventory saved successfully.");
        pushActivity(
          "Inventory Persisted",
          "All blood units recorded permanently in database."
        );
      } else {
        setMessage(data.message || "Failed to save inventory.");
      }
    } catch (error) {
      console.error("Error saving inventory to MongoDB:", error);
      setMessage("Failed to reach server to save inventory.");
    } finally {
      setIsSavingInventory(false);
    }
  };

  const data = useMemo(() => {
    const totalUnits = Object.values(stock).reduce(
      (total, value) => total + Number(value),
      0
    );

    const lowStock = BLOOD_GROUPS.filter(
      (group) => Number(stock[group] || 0) <= 3
    );

    const pending = requests.filter((request) => request.status === "Pending");

    const dispatched = requests.filter(
      (request) => request.status === "Dispatched"
    );

    const critical = pending.filter(
      (request) => (request.priority || "").toLowerCase() === "critical"
    );

    return {
      totalUnits,
      lowStock,
      pending,
      dispatched,
      critical,
    };
  }, [stock, requests]);

  const visibleRequests = requests.filter((request) => {
    if (filter === "All") return true;
    return request.status === filter;
  });

  const PageHeading = ({ kicker, icon: Icon, title, description }) => (
    <header className="bb-page-heading">
      <div>
        <p className="bb-kicker">
          <Icon size={14} />
          {kicker}
        </p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </header>
  );

  const EmptyState = ({ title, text }) => (
    <div className="bb-empty">
      <CheckCircle2 size={29} />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );

  const StockGrid = ({ editable = false }) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: "16px",
      }}
    >
      {BLOOD_GROUPS.map((group) => {
        const units = Number(stock[group] || 0);
        const isBusy = updatingGroup === group;

        return (
          <div
            key={group}
            style={{
              padding: "16px",
              borderRadius: "14px",
              border: units <= 3 ? "1.5px solid #f87171" : "1px solid #e2e8f0",
              background: units <= 3 ? "#fff5f5" : "#ffffff",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              position: "relative",
            }}
          >
            {units <= 3 && (
              <span
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  background: "#ef4444",
                  color: "#fff",
                  fontSize: "10px",
                  fontWeight: 800,
                  padding: "2px 6px",
                  borderRadius: "99px",
                  textTransform: "uppercase",
                }}
              >
                Critical Low
              </span>
            )}

            <div>
              <strong
                style={{
                  fontSize: "20px",
                  color: "#111827",
                  display: "block",
                }}
              >
                {group}
              </strong>
              <span
                style={{
                  fontSize: "13px",
                  color: "#6b7280",
                  margin: "6px 0",
                  display: "block",
                }}
              >
                Available:{" "}
                <b style={{ color: units <= 3 ? "#dc2626" : "#16a34a" }}>
                  {units} Units
                </b>
              </span>
            </div>

            {editable && (
              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                <button
                  type="button"
                  disabled={units <= 0 || isBusy}
                  onClick={() => adjustStock(group, -1)}
                  style={{
                    flex: 1,
                    padding: "6px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    fontWeight: 700,
                    cursor: units <= 0 || isBusy ? "not-allowed" : "pointer",
                    opacity: units <= 0 || isBusy ? 0.5 : 1,
                  }}
                >
                  -
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => adjustStock(group, 1)}
                  style={{
                    flex: 1,
                    padding: "6px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    fontWeight: 700,
                    cursor: isBusy ? "not-allowed" : "pointer",
                    opacity: isBusy ? 0.5 : 1,
                  }}
                >
                  +
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const RequestFeed = () => (
    <section className="bb-panel">
      <div className="bb-panel-heading">
        <div>
          <p className="bb-kicker">
            <ClipboardList size={14} />
            HOSPITAL NETWORK
          </p>
          <h3>Incoming requests</h3>
        </div>

        <span className="bb-count-pill">{data.pending.length} pending</span>
      </div>

      <div className="bb-filter-group" style={{ marginBottom: "20px" }}>
        {["All", "Pending", "Dispatched"].map((option) => (
          <button
            type="button"
            className={filter === option ? "active" : ""}
            key={option}
            onClick={() => setFilter(option)}
          >
            {option}
          </button>
        ))}
      </div>

      {visibleRequests.length === 0 ? (
        <EmptyState
          title="No requests in this view"
          text="New verified hospital requirements will appear here."
        />
      ) : (
        <div className="bb-request-list">
          {visibleRequests.map((request) => {
            const complete = request.status === "Dispatched";
            const available = Number(stock[request.group] || 0);
            const canDispatch = available >= request.units;
            const isBusy = dispatchingId === request.id;

            return (
              <article className="bb-request" key={request.id}>
                <div className="bb-request-main">
                  <span className="bb-request-badge">{request.group}</span>

                  <div className="bb-request-details">
                    <h3>{request.hospital}</h3>
                    <div className="bb-request-meta">
                      <span
                        className={`bb-priority ${
                          (request.priority || "").toLowerCase() === "critical"
                            ? "critical"
                            : ""
                        }`}
                      >
                        {request.priority}
                      </span>
                      <span className="bb-request-subtext">
                        {request.units} units required · {request.ward} · (
                        {available} in reserve)
                      </span>
                    </div>

                    <div style={{ marginTop: "8px" }}>
                      <a
                        href={generateWhatsAppBroadcastUrl({
                          hospitalName: request.hospital,
                          district: request.district,
                          bloodGroup: request.group,
                          unitsRequired: request.units,
                          urgencyLevel: request.priority,
                          contactPhone: request.contactPhone,
                          requestId: request.id,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          backgroundColor: "#25D366",
                          color: "#ffffff",
                          padding: "5px 10px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          textDecoration: "none",
                        }}
                      >
                        <MessageSquare size={12} fill="currentColor" />
                        Share to WhatsApp
                      </a>
                    </div>
                  </div>
                </div>

                <div className="bb-request-actions">
                  {complete ? (
                    <span className="bb-dispatched">
                      <Check size={16} />
                      Dispatched
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!canDispatch || isBusy}
                      onClick={() =>
                        handleDispatchUnits(
                          request.id,
                          request.group,
                          request.units
                        )
                      }
                      style={{
                        padding: "7px 14px",
                        backgroundColor: canDispatch ? "#16a34a" : "#94a3b8",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor:
                          canDispatch && !isBusy ? "pointer" : "not-allowed",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "background-color 0.2s ease",
                      }}
                    >
                      {isBusy ? (
                        <>
                          <Loader2 size={13} className="bb-spin" />
                          Dispatching...
                        </>
                      ) : canDispatch ? (
                        "Dispatch & Deduct Stock"
                      ) : (
                        "Insufficient Stock"
                      )}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );

  const DashboardView = () => {
    const stats = [
      {
        label: "Available units",
        value: data.totalUnits,
        text: "Packed RBC inventory",
        icon: Droplets,
        tone: "red",
      },
      {
        label: "Pending requests",
        value: data.pending.length,
        text: "Awaiting allocation",
        icon: ClipboardList,
        tone: "blue",
      },
      {
        label: "Low-stock groups",
        value: data.lowStock.length,
        text: "Three or fewer units",
        icon: TriangleAlert,
        tone: "amber",
      },
      {
        label: "Completed dispatches",
        value: data.dispatched.length,
        text: "Fulfilled requirements",
        icon: PackageCheck,
        tone: "green",
      },
    ];

    return (
      <div className="bb-view">
        <section className="bb-command-card">
          <span className="bb-command-grid" />

          <div className="bb-command-copy">
            <p className="bb-kicker">
              <Activity size={15} />
              INVENTORY COMMAND CENTRE
            </p>

            <h2>
              Every unit accounted for.
              <em>Every request in view.</em>
            </h2>

            <p>
              {data.pending.length} hospital requests are pending and{" "}
              {data.lowStock.length} blood groups are below the safe-stock
              threshold.
            </p>

            <div className="bb-command-status">
              <span>
                <i />
                {data.critical.length} critical requests
              </span>

              <span>
                <ShieldCheck size={16} />
                Cold chain protected
              </span>
            </div>
          </div>

          <div className="bb-cold-chain">
            <Snowflake size={28} />
            <small>COLD CHAIN</small>
            <strong>2–6°C</strong>
            <span>Storage secure</span>
          </div>
        </section>

        <section className="bb-stat-grid">
          {stats.map(({ label, value, text, icon: Icon, tone }) => (
            <article className="bb-stat-card" key={label}>
              <div className="bb-stat-head">
                <small>{label}</small>
                <span className={`bb-stat-icon ${tone}`}>
                  <Icon size={20} />
                </span>
              </div>
              <strong>{value}</strong>
              <p>{text}</p>
            </article>
          ))}
        </section>

        <section className="bb-dashboard-grid">
          <article className="bb-panel">
            <div className="bb-panel-heading">
              <div>
                <p className="bb-kicker">LIVE RESERVES</p>
                <h3>Blood inventory</h3>
              </div>
              <span className="bb-live-pill">MongoDB Synchronized</span>
            </div>

            <StockGrid editable={false} />
          </article>

          <aside className="bb-side-stack">
            <article className="bb-panel">
              <div className="bb-panel-heading">
                <div>
                  <p className="bb-kicker">AUDIT STREAM</p>
                  <h3>Recent activity</h3>
                </div>
                <Activity size={20} />
              </div>

              {activity.map((item) => (
                <div className="bb-activity-item" key={item.id}>
                  <i />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                  <time>{item.time}</time>
                </div>
              ))}
            </article>

            <article className="bb-panel bb-readiness">
              <p className="bb-kicker">NETWORK READINESS</p>
              <div className="bb-readiness-score" style={{ marginTop: "14px" }}>
                <div className="bb-readiness-ring">
                  <strong>
                    {Math.max(0, 100 - data.lowStock.length * 8)}%
                  </strong>
                </div>
                <div className="bb-readiness-copy">
                  <strong>Safe Margin Reserve</strong>
                  <span>Stock levels across vital groups</span>
                </div>
              </div>
            </article>
          </aside>
        </section>
      </div>
    );
  };

  const InventoryView = () => (
    <div className="bb-view">
      <PageHeading
        kicker="COLD LEDGER"
        icon={Snowflake}
        title="Inventory management"
        description="Update temperature-regulated stock live and save changes directly to MongoDB."
      />

      <section className="bb-inventory-management">
        <div className="bb-inventory-header-bar">
          <div className="bb-inventory-total-info">
            <div>
              <small>TOTAL RESERVE IN STORAGE</small>
              <strong>{data.totalUnits} Units</strong>
            </div>
          </div>

          <button
            type="button"
            className="bb-save-inventory-btn"
            onClick={saveInventoryToMongoDB}
            disabled={isSavingInventory}
          >
            {isSavingInventory ? (
              <>
                <Loader2 size={18} className="bb-spin" />
                Saving to Database...
              </>
            ) : (
              <>
                <Save size={18} />
                Save
              </>
            )}
          </button>
        </div>

        <StockGrid editable={true} />

        <ColdChainBatchManager
          bloodBankId={currentUser?._id || currentUser?.id}
          onBatchUpdate={loadStock}
        />
      </section>
    </div>
  );

  const IncomingView = () => (
    <div className="bb-view">
      <PageHeading
        kicker="HOSPITAL DEMAND"
        icon={ClipboardList}
        title="Incoming requests"
        description="Review patient requirements and dispatch available stock."
      />
      <RequestFeed />
    </div>
  );

  const CoordinationView = () => (
    <div className="bb-view">
      <PageHeading
        kicker="DONOR NETWORK"
        icon={HeartHandshake}
        title="Donor coordination"
        description="Coordinate eligible donors with low-stock blood groups."
      />

      <section
        className="bb-coordination-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "16px",
        }}
      >
        {data.lowStock.map((group) => (
          <article className="bb-coordination-card" key={group}>
            <span>{group}</span>
            <div>
              <h3>Donor replenishment required</h3>
              <p>
                Current reserve: {stock[group]} units. Notify matching donors in
                the surrounding district.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setMessage(`${group} donor notification prepared.`)
              }
            >
              <Send size={15} />
              Notify donors
            </button>
          </article>
        ))}

        {data.lowStock.length === 0 && (
          <div style={{ gridColumn: "1 / -1" }}>
            <EmptyState
              title="Inventory levels are healthy"
              text="No donor replenishment broadcast is currently required."
            />
          </div>
        )}
      </section>
    </div>
  );

  const ReportsView = () => (
    <div className="bb-view">
      <PageHeading
        kicker="INFLOW / OUTFLOW"
        icon={BarChart3}
        title="Blood-bank reports"
        description="Live inventory, dispatch, and request-fulfillment statistics."
      />

      <section
        className="bb-report-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "16px",
        }}
      >
        {[
          {
            label: "Current reserve",
            value: data.totalUnits,
            text: "Total blood units",
            icon: Droplets,
          },
          {
            label: "Requests received",
            value: requests.length,
            text: "Regional hospital demand",
            icon: ClipboardList,
          },
          {
            label: "Requests fulfilled",
            value: data.dispatched.length,
            text: "Completed dispatches",
            icon: PackageCheck,
          },
          {
            label: "Low-stock groups",
            value: data.lowStock.length,
            text: "Require replenishment",
            icon: TriangleAlert,
          },
        ].map(({ label, value, text, icon: Icon }) => (
          <article className="bb-report-card" key={label}>
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
  );

  const renderView = (activeTab) => {
    if (!activeTab || activeTab === "dashboard") return <DashboardView />;
    if (activeTab === "inventory") return <InventoryView />;
    if (activeTab === "incoming") return <IncomingView />;
    if (activeTab === "coordination") return <CoordinationView />;
    if (activeTab === "reports") return <ReportsView />;
    return <DashboardView />;
  };

  return (
    <PortalShell
      title={bloodBankName}
      subtitle="Inventory and hospital coordination"
      role="bloodbank"
      user={user}
      icon={Building2}
      onBack={onBack}
    >
      {({ activeTab }) => (
        <div className="bloodbank-dashboard">
          {message && (
            <div className="bb-message" role="status">
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

          <div className="bb-dashboard-inner">
            <header className="bb-welcome">
              <div>
                <p className="bb-kicker">LIVE COLD-CHAIN NETWORK</p>

                <h1>
                  {greeting}, <em>{bloodBankName}.</em>
                </h1>

                <p>
                  Ready stock, donor pipelines, and hospital dispatches
                  synchronized in real time.
                </p>
              </div>

              <div className="bb-header-actions">
                <div className="bb-network-time">
                  <span>NETWORK TIME · IST</span>
                  <strong>{istTimeStr}</strong>
                  <small>Database synchronized</small>
                </div>

                <button
                  type="button"
                  className="bb-refresh-button"
                  onClick={refreshWorkspace}
                  disabled={isRefreshing}
                >
                  <RefreshCw
                    size={17}
                    className={isRefreshing ? "bb-spin" : ""}
                  />
                  Refresh
                </button>
              </div>
            </header>

            {renderView(activeTab)}
          </div>
        </div>
      )}
    </PortalShell>
  );
}