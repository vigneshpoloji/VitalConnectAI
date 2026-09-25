import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  Droplets,
  Hospital,
  Info,
  LockKeyhole,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";

import PortalShell from "../../components/PortalShell";
import { getISTGreetingData } from "../../utils/istTime";
import "./AdminDashboard.css";

const INITIAL_ACCOUNTS = [
  {
    id: "USR-1024",
    name: "Arjun Kumar",
    email: "arjun@example.com",
    role: "Donor",
    status: "Active",
    district: "Hyderabad",
    joined: "12 Sep 2026",
  },
  {
    id: "HSP-2051",
    name: "CityCare Hospital",
    email: "admin@citycare.in",
    role: "Hospital",
    status: "Pending",
    district: "Kamareddy",
    joined: "18 Sep 2026",
  },
  {
    id: "BNK-3308",
    name: "LifeLine Blood Centre",
    email: "operations@lifeline.in",
    role: "Blood Bank",
    status: "Active",
    district: "Hyderabad",
    joined: "09 Sep 2026",
  },
];

function getActionIcon(action = "", severity = "") {
  const lowerAction = action.toLowerCase();
  const lowerSeverity = severity.toLowerCase();

  if (
    lowerSeverity === "warning" ||
    lowerSeverity === "critical" ||
    lowerAction.includes("suspend") ||
    lowerAction.includes("reject")
  ) {
    return ShieldAlert;
  }
  if (
    lowerAction.includes("active") ||
    lowerAction.includes("approv") ||
    lowerAction.includes("verif")
  ) {
    return ShieldCheck;
  }
  if (lowerAction.includes("dispatch") || lowerAction.includes("unit")) {
    return Droplets;
  }
  if (lowerAction.includes("camp") || lowerAction.includes("drive")) {
    return Calendar;
  }
  return Activity;
}

function formatAuditTime(dateString) {
  if (!dateString) return "Now";
  const date = new Date(dateString);
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);

  if (diffMinutes < 1) return "Now";
  if (diffMinutes < 60) return `${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr`;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function NetworkTimeWidget() {
  const [{ istTimeStr }, setIstData] = useState(getISTGreetingData);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIstData(getISTGreetingData());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="ad-network-time">
      <span>NETWORK TIME · IST</span>
      <strong>{istTimeStr}</strong>
      <small>
        <i />
        All systems operational
      </small>
    </div>
  );
}

export default function AdminDashboard({ user, onBack }) {
  const currentUser =
    user || JSON.parse(localStorage.getItem("vital_user") || "{}");

  const administratorName = currentUser?.name || "Administrator";
  const { greeting } = useMemo(() => getISTGreetingData(), []);

  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS);
  const [camps, setCamps] = useState([]);
  const [activity, setActivity] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [message, setMessage] = useState("");

  // Audit Stream & Filter State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditStats, setAuditStats] = useState({ total: 0, critical: 0, warnings: 0 });
  const [severityFilter, setSeverityFilter] = useState("all");

  const fetchAccounts = useCallback(async () => {
    try {
      const token = localStorage.getItem("vital_token");
      const res = await fetch("http://localhost:5000/api/admin/users", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.status === 403) {
        const errData = await res.json().catch(() => ({}));
        localStorage.removeItem("vital_token");
        localStorage.removeItem("vital_user");
        alert(
          `⚠️ Access Revoked: ${
            errData.message || "Administrator session revoked."
          }`
        );
        if (typeof onBack === "function") onBack();
        else window.location.href = "/";
        return;
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setAccounts(
          data.users.map((u) => ({
            id: u._id || u.id,
            name:
              u.name ||
              u.fullName ||
              u.facilityName ||
              u.hospitalName ||
              "Registered Entity",
            email: u.email,
            role: u.role || "Donor",
            status: u.status || "Active",
            district: u.district || "Kamareddy",
            joined: new Date(u.createdAt || Date.now()).toLocaleDateString(
              "en-IN",
              {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }
            ),
          }))
        );
      }
    } catch (err) {
      console.warn("Using fallback local account state:", err.message);
    }
  }, [onBack]);

  const fetchPendingCamps = useCallback(async () => {
    try {
      const token = localStorage.getItem("vital_token");
      const res = await fetch("http://localhost:5000/api/admin/camps/pending", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.camps)) {
        setCamps(data.camps);
      }
    } catch (err) {
      console.warn("Failed to load camp proposals:", err.message);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const token = localStorage.getItem("vital_token");
      const url =
        severityFilter === "all"
          ? "http://localhost:5000/api/audit?limit=30"
          : `http://localhost:5000/api/audit?severity=${severityFilter}&limit=30`;

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.logs)) {
        setAuditLogs(data.logs);
        if (data.stats) setAuditStats(data.stats);

        // Synchronize top items with the overview sidebar
        const formattedLogs = data.logs.slice(0, 8).map((log) => ({
          id: log._id || `${Date.now()}-${Math.random()}`,
          title: log.action || "System Event",
          detail: log.details || "Database activity recorded.",
          time: formatAuditTime(log.createdAt),
          icon: getActionIcon(log.action, log.severity),
          severity: log.severity || "info",
        }));
        setActivity(formattedLogs);
      }
    } catch (err) {
      console.warn("Failed to load audit logs:", err.message);
    }
  }, [severityFilter]);

  useEffect(() => {
    fetchAccounts();
    fetchPendingCamps();
    fetchAuditLogs();

    const fastSyncTimer = window.setInterval(() => {
      fetchAccounts();
      fetchPendingCamps();
    }, 3000);

    const auditSyncTimer = window.setInterval(fetchAuditLogs, 5000);

    return () => {
      window.clearInterval(fastSyncTimer);
      window.clearInterval(auditSyncTimer);
    };
  }, [fetchAccounts, fetchPendingCamps, fetchAuditLogs]);

  const updateCampStatus = async (campId, status) => {
    try {
      const token = localStorage.getItem("vital_token");
      const res = await fetch(`http://localhost:5000/api/admin/camps/${campId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setCamps((prev) => prev.filter((c) => (c._id || c.id) !== campId));
        setMessage(`Camp proposal ${status.toLowerCase()} successfully.`);
        fetchAuditLogs();
      }
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  const pendingAccounts = useMemo(
    () => accounts.filter((account) => account.status === "Pending"),
    [accounts]
  );

  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.status === "Active"),
    [accounts]
  );

  const suspendedAccounts = useMemo(
    () => accounts.filter((account) => account.status === "Suspended"),
    [accounts]
  );

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return accounts.filter((account) => {
      const matchesRole =
        roleFilter === "All" || account.role === roleFilter;

      const matchesSearch =
        !query ||
        account.name.toLowerCase().includes(query) ||
        account.email.toLowerCase().includes(query) ||
        account.id.toLowerCase().includes(query) ||
        account.district.toLowerCase().includes(query);

      return matchesRole && matchesSearch;
    });
  }, [accounts, search, roleFilter]);

  const roleBreakdown = useMemo(() => {
    const roles = ["Donor", "Hospital", "Blood Bank"];

    return roles.map((role) => ({
      role,
      count: accounts.filter((account) => account.role === role).length,
    }));
  }, [accounts]);

  const changeAccountStatus = async (accountId, status) => {
    const account = accounts.find((item) => item.id === accountId);
    if (!account) return;

    setAccounts((previous) =>
      previous.map((item) =>
        item.id === accountId ? { ...item, status } : item
      )
    );

    const action =
      status === "Active"
        ? "approved"
        : status === "Suspended"
          ? "suspended"
          : "updated";

    setMessage(`${account.name} was ${action} successfully.`);

    try {
      const token = localStorage.getItem("vital_token");
      await fetch(`http://localhost:5000/api/admin/users/${accountId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      fetchAuditLogs();
    } catch (e) {
      console.warn("Backend status update skipped:", e.message);
    }
  };

  const renderCampsView = () => (
    <div className="admin-view">
      <header className="ad-page-heading">
        <div>
          <p className="ad-kicker">
            <Calendar size={14} />
            CLINICAL GOVERNANCE
          </p>
          <h2>Camp Accreditation Desk</h2>
          <p>
            Review, verify, and accredit public and institutional blood donation drives.
          </p>
        </div>

        <span className="ad-directory-count">{camps.length} pending drives</span>
      </header>

      <section className="ad-panel">
        <div className="ad-panel-heading">
          <div>
            <p className="ad-kicker">ACCREDITATION QUEUE</p>
            <h3>Blood Camp Verification Requests</h3>
          </div>
          <span className="ad-pill attention">{camps.length} awaiting review</span>
        </div>

        {camps.length === 0 ? (
          <div className="ad-empty">
            <CheckCircle2 size={28} />
            <strong>Accreditation Desk is Clear</strong>
            <p>All community blood camp proposals have been reviewed and medically verified.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {camps.map((camp) => (
              <div
                className="ad-approval"
                key={camp._id || camp.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  borderRadius: "14px",
                  background: "#faf7f8",
                  border: "1px solid rgba(65, 39, 49, 0.08)",
                }}
              >
                <div>
                  <strong style={{ fontSize: "1rem", display: "block", color: "var(--ad-black, #191316)" }}>
                    {camp.campName}
                  </strong>
                  <span style={{ fontSize: "0.82rem", color: "var(--ad-muted, #766b70)", display: "block", margin: "4px 0" }}>
                    Organizer: <b>{camp.organizer}</b> · Venue: <b>{camp.venue}</b> ({camp.district || "Kamareddy"})
                  </span>
                  <small style={{ fontSize: "0.75rem", color: "#9a8b90" }}>
                    Proposed Date:{" "}
                    <b>
                      {new Date(camp.preferredDate).toLocaleDateString("en-IN", {
                        dateStyle: "medium",
                      })}
                    </b>{" "}
                    · Target Donors: <b>{camp.expectedDonors || 50}</b>
                  </small>
                </div>

                <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
                  <button
                    type="button"
                    className="ad-row-button danger"
                    onClick={() => updateCampStatus(camp._id || camp.id, "Rejected")}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "10px",
                      border: "1px solid rgba(214, 16, 53, 0.2)",
                      background: "#fff0f3",
                      color: "#bd1230",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Reject
                  </button>

                  <button
                    type="button"
                    className="ad-row-button"
                    onClick={() => updateCampStatus(camp._id || camp.id, "Medically Verified")}
                    style={{
                      padding: "8px 18px",
                      borderRadius: "10px",
                      border: "0",
                      background: "#16815f",
                      color: "#ffffff",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Accredit & Verify
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  const renderOverviewView = () => {
    const stats = [
      {
        label: "Total accounts",
        value: accounts.length,
        detail: "Across all verified roles",
        icon: Users,
        tone: "red",
      },
      {
        label: "Active users",
        value: activeAccounts.length,
        detail: "Currently approved",
        icon: UserCheck,
        tone: "green",
      },
      {
        label: "Pending approvals",
        value: pendingAccounts.length,
        detail: "Awaiting verification",
        icon: ShieldAlert,
        tone: "amber",
      },
      {
        label: "Security events",
        value: suspendedAccounts.length,
        detail: "Accounts under review",
        icon: LockKeyhole,
        tone: "blue",
      },
    ];

    return (
      <div className="admin-view">
        <section className="ad-command-card">
          <span className="ad-command-grid" />

          <div className="ad-command-copy">
            <p className="ad-kicker">
              <ShieldCheck size={15} />
              GOVERNANCE COMMAND CENTRE
            </p>

            <h2>
              Every account verified.
              <em>Every action accountable.</em>
            </h2>

            <p>
              Monitor identity approvals, system health, security events, and
              regional service activity from one protected workspace.
            </p>

            <div className="ad-command-actions">
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("admin-approvals")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Review approvals
                <ChevronRight size={17} />
              </button>

              <span>
                <i />
                All core services operational
              </span>
            </div>
          </div>

          <div className="ad-trust-score">
            <div>
              <strong>94%</strong>
              <small>TRUST SCORE</small>
            </div>
            <span>Network integrity</span>
          </div>
        </section>

        <section className="ad-stat-grid">
          {stats.map(({ label, value, detail, icon: Icon, tone }) => (
            <article key={label}>
              <span className={`ad-stat-icon ${tone}`}>
                <Icon size={20} />
              </span>
              <div>
                <small>{label}</small>
                <strong>{value}</strong>
                <p>{detail}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="ad-overview-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <article className="ad-panel" id="admin-approvals">
              <div className="ad-panel-heading">
                <div>
                  <p className="ad-kicker">REGISTRATION QUEUE</p>
                  <h3>Pending approvals</h3>
                </div>
                <span className="ad-pill attention">
                  {pendingAccounts.length} pending
                </span>
              </div>

              {pendingAccounts.length === 0 ? (
                <div className="ad-empty">
                  <CheckCircle2 size={28} />
                  <strong>Queue is clear</strong>
                  <p>There are no registrations awaiting approval.</p>
                </div>
              ) : (
                pendingAccounts.map((account) => (
                  <div className="ad-approval" key={account.id}>
                    <span className="ad-approval-icon">
                      {account.role === "Hospital" ? (
                        <Hospital size={19} />
                      ) : (
                        <Building2 size={19} />
                      )}
                    </span>

                    <div>
                      <strong>{account.name}</strong>
                      <span>
                        {account.role} · {account.district}
                      </span>
                      <small>{account.id}</small>
                    </div>

                    <button
                      type="button"
                      onClick={() => changeAccountStatus(account.id, "Active")}
                      aria-label={`Approve ${account.name}`}
                    >
                      <Check size={17} />
                    </button>
                  </div>
                ))
              )}
            </article>

            <section className="ad-panel">
              <div className="ad-panel-heading">
                <div>
                  <p className="ad-kicker">COMMUNITY DRIVES</p>
                  <h3>Pending Blood Camp Proposals</h3>
                </div>
                <span className="ad-pill attention">{camps.length} pending review</span>
              </div>

              {camps.length === 0 ? (
                <div className="ad-empty">
                  <CheckCircle2 size={28} />
                  <strong>No pending drives</strong>
                  <p>All submitted blood camp proposals are medically verified.</p>
                </div>
              ) : (
                camps.map((camp) => (
                  <div className="ad-approval" key={camp._id || camp.id}>
                    <div>
                      <strong>{camp.campName}</strong>
                      <span>{camp.organizer} · {camp.venue}</span>
                      <small>
                        Preferred Date:{" "}
                        {new Date(camp.preferredDate).toLocaleDateString("en-IN", {
                          dateStyle: "medium",
                        })}{" "}
                        · Expected Donors: {camp.expectedDonors}
                      </small>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className="ad-row-button"
                        onClick={() => updateCampStatus(camp._id || camp.id, "Medically Verified")}
                      >
                        Verify Drive
                      </button>
                    </div>
                  </div>
                ))
              )}
            </section>
          </div>

          <aside className="ad-side-stack">
            <article className="ad-panel">
              <div className="ad-panel-heading">
                <div>
                  <p className="ad-kicker">ROLE DISTRIBUTION</p>
                  <h3>Network accounts</h3>
                </div>
                <TrendingUp size={20} />
              </div>

              <div className="ad-role-chart">
                {roleBreakdown.map(({ role, count }) => (
                  <div key={role}>
                    <span>{role}</span>
                    <i
                      style={{
                        "--role-width": `${
                          accounts.length
                            ? Math.max(8, (count / accounts.length) * 100)
                            : 0
                        }%`,
                      }}
                    />
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="ad-panel">
              <div className="ad-panel-heading">
                <div>
                  <p className="ad-kicker">AUDIT STREAM</p>
                  <h3>Recent activity</h3>
                </div>
                <Activity size={20} />
              </div>

              {activity.length === 0 ? (
                <div className="ad-empty" style={{ padding: "20px 0" }}>
                  <Activity size={20} />
                  <strong>No recent activity</strong>
                  <p>System actions will stream here live from MongoDB.</p>
                </div>
              ) : (
                activity.map(({ id, title, detail, time, icon: Icon, severity }) => (
                  <div className={`ad-activity ${severity ? severity.toLowerCase() : ""}`} key={id}>
                    <span>
                      <Icon size={16} />
                    </span>
                    <div>
                      <strong>{title}</strong>
                      <small>{detail}</small>
                    </div>
                    <time>{time}</time>
                  </div>
                ))
              )}
            </article>
          </aside>
        </section>
      </div>
    );
  };

  const renderUsersView = () => (
    <div className="admin-view">
      <header className="ad-page-heading">
        <div>
          <p className="ad-kicker">
            <Users size={14} />
            IDENTITY DIRECTORY
          </p>
          <h2>User management</h2>
          <p>
            Search, approve, suspend, and reactivate registered accounts.
          </p>
        </div>

        <span className="ad-directory-count">{accounts.length} accounts</span>
      </header>

      <section className="ad-panel">
        <div className="ad-tools">
          <label className="ad-search">
            <Search size={17} />
            <input
              type="search"
              placeholder="Search name, email, ID or district"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            aria-label="Filter by role"
          >
            <option value="All">All</option>
            <option value="Donor">Donor</option>
            <option value="Hospital">Hospital</option>
            <option value="Blood Bank">Blood Bank</option>
          </select>
        </div>

        <div className="ad-table-scroll">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Role</th>
                <th>District</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="ad-no-results">
                    No accounts match your filters.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <div className="ad-account-cell">
                        <span>{account.name.charAt(0)}</span>
                        <div>
                          <strong>{account.name}</strong>
                          <small>{account.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>{account.role}</td>
                    <td>{account.district}</td>
                    <td>{account.joined}</td>
                    <td>
                      <span
                        className={`ad-status ${account.status.toLowerCase()}`}
                      >
                        {account.status}
                      </span>
                    </td>
                    <td>
                      {account.status === "Pending" ? (
                        <button
                          className="ad-row-button"
                          type="button"
                          onClick={() =>
                            changeAccountStatus(account.id, "Active")
                          }
                        >
                          Approve
                        </button>
                      ) : account.status === "Suspended" ? (
                        <button
                          className="ad-row-button"
                          type="button"
                          onClick={() =>
                            changeAccountStatus(account.id, "Active")
                          }
                        >
                          Reactivate
                        </button>
                      ) : (
                        <button
                          className="ad-row-button danger"
                          type="button"
                          onClick={() =>
                            changeAccountStatus(account.id, "Suspended")
                          }
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );

  const renderReportsView = () => (
    <div className="admin-view">
      <header className="ad-page-heading">
        <div>
          <p className="ad-kicker">
            <BarChart3 size={14} />
            SYSTEM INTELLIGENCE
          </p>
          <h2>System reports</h2>
          <p>Live statistics for accounts, approvals, and network integrity.</p>
        </div>
      </header>

      <section className="ad-report-grid">
        {[
          {
            label: "Account approval rate",
            value: `${Math.round(
              (activeAccounts.length / Math.max(accounts.length, 1)) * 100
            )}%`,
            icon: UserCheck,
          },
          {
            label: "Pending verification",
            value: pendingAccounts.length,
            icon: ShieldAlert,
          },
          {
            label: "Critical audit alerts",
            value: auditStats.critical || 0,
            icon: AlertTriangle,
          },
          {
            label: "Total audit events",
            value: auditStats.total || 0,
            icon: Database,
          },
        ].map(({ label, value, icon: Icon }) => (
          <article key={label}>
            <span>
              <Icon size={21} />
            </span>
            <small>{label}</small>
            <strong>{value}</strong>
            <p>Live governance metric</p>
          </article>
        ))}
      </section>

      <section className="ad-panel" style={{ marginTop: "24px" }}>
        <div className="ad-panel-heading">
          <div>
            <p className="ad-kicker">GOVERNANCE & INTEGRITY</p>
            <h3>Immutable Audit Trail</h3>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {["all", "info", "warning", "critical"].map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setSeverityFilter(filter)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  background: severityFilter === filter ? "#bd1230" : "#fff",
                  color: severityFilter === filter ? "#fff" : "#443",
                  cursor: "pointer",
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {auditLogs.length === 0 ? (
            <p style={{ textAlign: "center", color: "#887", padding: "20px" }}>
              No audit activities recorded yet.
            </p>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log._id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  background:
                    log.severity === "warning"
                      ? "#fff6e8"
                      : log.severity === "critical"
                      ? "#fff0f3"
                      : "#faf7f8",
                  border: "1px solid #efe4e6",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <strong style={{ fontSize: "13px", color: "#1a1215" }}>
                      {log.action}
                    </strong>
                    <span style={{ fontSize: "11px", color: "#776b70" }}>
                      by {log.performedBy?.name || "System"} ({log.performedBy?.role || "System"})
                    </span>
                    {log.target?.entity && (
                      <span
                        style={{
                          fontSize: "10px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "rgba(0,0,0,0.05)",
                          color: "#665",
                        }}
                      >
                        Target: {log.target.entity}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#554a4f" }}>
                    {log.details}
                  </p>
                </div>
                <small style={{ color: "#998d92", fontSize: "11px", whiteSpace: "nowrap" }}>
                  {new Date(log.createdAt).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </small>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="ad-panel" style={{ marginTop: "24px" }}>
        <div className="ad-panel-heading">
          <div>
            <p className="ad-kicker">ACCOUNT COMPOSITION</p>
            <h3>Registered roles</h3>
          </div>
        </div>

        <div className="ad-role-chart large">
          {roleBreakdown.map(({ role, count }) => (
            <div key={role}>
              <span>{role}</span>
              <i
                style={{
                  "--role-width": `${
                    accounts.length ? (count / accounts.length) * 100 : 0
                  }%`,
                }}
              />
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const renderSettingsView = () => (
    <div className="admin-view">
      <header className="ad-page-heading">
        <div>
          <p className="ad-kicker">
            <Settings size={14} />
            SECURITY CONTROLS
          </p>
          <h2>Settings and permissions</h2>
          <p>Manage platform security and administrator controls.</p>
        </div>
      </header>

      <section className="ad-settings-grid">
        {[
          {
            title: "Role permissions",
            description:
              "Control access for donors, hospitals, and blood banks.",
            icon: Users,
          },
          {
            title: "Authentication security",
            description:
              "Manage MFA, secret keys, session policies, and login controls.",
            icon: LockKeyhole,
          },
          {
            title: "Fraud detection",
            description:
              "Review identity anomalies and suspicious account activity.",
            icon: ShieldAlert,
          },
          {
            title: "System integrations",
            description:
              "Configure VitalAI, notification, and reporting services.",
            icon: Database,
          },
        ].map(({ title, description, icon: Icon }) => (
          <article className="ad-setting-card" key={title}>
            <span>
              <Icon size={22} />
            </span>
            <h3>{title}</h3>
            <p>{description}</p>
            <button type="button">
              Configure
              <ChevronRight size={16} />
            </button>
          </article>
        ))}
      </section>
    </div>
  );

  const renderView = (activeTab) => {
    if (!activeTab || activeTab === "overview") return renderOverviewView();
    if (activeTab === "camps" || activeTab === "accreditation") return renderCampsView();
    if (activeTab === "users") return renderUsersView();
    if (activeTab === "reports") return renderReportsView();
    if (activeTab === "settings") return renderSettingsView();
    return renderOverviewView();
  };

  return (
    <PortalShell
      title="Administrator"
      subtitle="System governance and security"
      role="admin"
      user={user}
      onBack={onBack}
    >
      {({ activeTab }) => (
        <div className="admin-dashboard">
          {message && (
            <div className="ad-message" role="status">
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

          <div className="ad-dashboard-inner">
            <header className="ad-welcome">
              <div>
                <p className="ad-kicker">
                  <i />
                  LIVE GOVERNANCE NETWORK
                </p>
                <h1>
                  {greeting}, <em>{administratorName}.</em>
                </h1>
                <p>
                  Identity approvals, security signals, and platform health in
                  one protected command workspace.
                </p>
              </div>

              <NetworkTimeWidget />
            </header>

            {renderView(activeTab)}
          </div>
        </div>
      )}
    </PortalShell>
  );
}