import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  ChevronRight,
  Droplets,
  HeartHandshake,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Radio,
  Settings,
  ShieldAlert,
  UserCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";

import VitalAIAssistant from "./VitalAIAssistant";
import "./portal-views.css";

const ROLE_NAVIGATIONS = {
  donor: [
    {
      id: "profile",
      label: "Home / Profile",
      icon: UserRound,
    },
    {
      id: "requests",
      label: "Live Requests",
      icon: Radio,
    },
    {
      id: "donate",
      label: "Donate Now",
      icon: HeartHandshake,
    },
    {
      id: "history",
      label: "Donation History",
      icon: History,
    },
    {
      id: "alerts",
      label: "Notifications",
      icon: Bell,
    },
  ],

  hospital: [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "patient-requests",
      label: "Patient Requests",
      icon: Activity,
    },
    {
      id: "donor-matching",
      label: "Live Donor Matching",
      icon: Users,
    },
    {
      id: "bank-inventory",
      label: "Blood Bank Inventory",
      icon: Droplets,
    },
    {
      id: "reports",
      label: "Reports",
      icon: BarChart3,
    },
    {
      id: "alerts",
      label: "Notifications",
      icon: Bell,
    },
  ],

  bloodbank: [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "inventory",
      label: "Inventory Management",
      icon: Package,
    },
    {
      id: "incoming",
      label: "Incoming Requests",
      icon: Radio,
    },
    {
      id: "coordination",
      label: "Donor Coordination",
      icon: Users,
    },
    {
      id: "reports",
      label: "Reports",
      icon: BarChart3,
    },
    {
      id: "alerts",
      label: "Notifications",
      icon: Bell,
    },
  ],

  admin: [
    {
      id: "overview",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "users",
      label: "User Management",
      icon: UserCheck,
    },
    {
      id: "reports",
      label: "System Reports",
      icon: BarChart3,
    },
    {
      id: "alerts",
      label: "Notifications & Fraud",
      icon: ShieldAlert,
    },
    {
      id: "settings",
      label: "Settings & Security",
      icon: Settings,
    },
  ],
};

const ROLE_LABELS = {
  donor: "Donor portal",
  hospital: "Hospital portal",
  bloodbank: "Blood bank portal",
  admin: "Administrator portal",
};

function resolveRoleKey(title = "", role = "") {
  const value = `${role} ${title}`.toLowerCase().replace(/[^a-z]/g, "");

  if (value.includes("admin")) return "admin";
  if (value.includes("hospital")) return "hospital";
  if (value.includes("bloodbank") || value.includes("bank")) return "bloodbank";
  return "donor";
}

function getInitials(name = "") {
  const words = name.trim().split(/\s+/);
  if (!words.length || !words[0]) return "VC";

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export default function PortalShell({
  title = "VitalConnectAI",
  subtitle = "Precision care, human impact.",
  role,
  user,
  icon,
  onBack = () => {
    localStorage.removeItem("vital_token");
    localStorage.removeItem("vital_user");
    window.location.href = "/auth?mode=login";
  },
  children,
}) {
  const roleKey = resolveRoleKey(title, role);

  const navigation =
    ROLE_NAVIGATIONS[roleKey] || ROLE_NAVIGATIONS.donor;

  const [activeTab, setActiveTab] = useState(navigation[0].id);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live Notification State
  const [roleNotifications, setRoleNotifications] = useState([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  const displayName =
    user?.name ||
    user?.fullName ||
    user?.hospitalName ||
    user?.facilityName ||
    title;

  const initials = getInitials(displayName);

  const activeNavigation = useMemo(
    () =>
      navigation.find((item) => item.id === activeTab) || navigation[0],
    [navigation, activeTab]
  );

  // Controlled notification polling (30-second interval)
  const fetchLiveNotifications = useCallback(async () => {
    try {
      const userDistrict = user?.district || "Kamareddy";
      const res = await fetch(
        `http://localhost:5000/api/notifications?role=${roleKey}&district=${encodeURIComponent(
          userDistrict
        )}`
      );
      const data = await res.json();

      if (data.success && Array.isArray(data.notifications)) {
        setRoleNotifications(
          data.notifications.map((n) => ({
            id: n._id || n.id,
            title: n.title,
            body: n.body,
            time: n.createdAt
              ? new Date(n.createdAt).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Just now",
            unread: Boolean(n.unread),
          }))
        );
        setUnreadAlerts(Number(data.unreadCount || 0));
      }
    } catch (err) {
      console.debug("Notification sync paused:", err.message);
    }
  }, [roleKey, user?.district]);

  useEffect(() => {
    fetchLiveNotifications();
    const interval = window.setInterval(fetchLiveNotifications, 30000);
    return () => window.clearInterval(interval);
  }, [fetchLiveNotifications]);

  // Mark notifications as read when the user views the Alerts tab
  useEffect(() => {
    if (activeTab === "alerts" && unreadAlerts > 0) {
      fetch("http://localhost:5000/api/notifications/mark-read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: roleKey,
          district: user?.district || "Kamareddy",
        }),
      })
        .then(() => setUnreadAlerts(0))
        .catch((err) => console.warn("Failed to mark notifications read:", err.message));
    }
  }, [activeTab, unreadAlerts, roleKey, user?.district]);

  // Real-time suspension eviction heartbeat (relaxed to 45 seconds to prevent spam)
  useEffect(() => {
    let isChecking = false;

    const runStatusCheck = async () => {
      const token = localStorage.getItem("vital_token");
      if (!token || isChecking) return;

      isChecking = true;
      try {
        let response = await fetch("http://localhost:5000/api/auth/verify-status", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 404) {
          response = await fetch("http://localhost:5000/api/login/verify-status", {
            headers: { Authorization: `Bearer ${token}` },
          });
        }

        if (response.status === 403) {
          const data = await response.json();

          localStorage.removeItem("vital_token");
          localStorage.removeItem("vital_user");

          alert(
            `⚠️ Access Revoked: ${
              data.message || "Your account has been suspended by an Administrator."
            }`
          );

          if (typeof onBack === "function") {
            onBack();
          } else {
            window.location.href = "/auth?mode=login";
          }
        }
      } catch (err) {
        // Silently ignore transient network errors
      } finally {
        isChecking = false;
      }
    };

    runStatusCheck();
    const interval = window.setInterval(runStatusCheck, 45000);

    return () => window.clearInterval(interval);
  }, [onBack]);

  const selectTab = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const renderNotifications = () => (
    <section className="portal-notification-view">
      <header className="portal-view-heading">
        <div>
          <span className="portal-view-kicker">
            <Bell size={14} />
            LIVE INBOX
          </span>
          <h1>Notifications</h1>
          <p>
            Urgent requests, network events, security warnings, and operational updates.
          </p>
        </div>

        <span className="portal-notification-count">
          {unreadAlerts} unread
        </span>
      </header>

      <div className="notifications-stream">
        {roleNotifications.length === 0 ? (
          <div className="portal-empty-state">
            <Bell size={28} />
            <strong>No notifications</strong>
            <p>New real-time alerts will appear here.</p>
          </div>
        ) : (
          roleNotifications.map((notification) => (
            <article
              key={notification.id}
              className={`alert-box-card ${notification.unread ? "unread" : ""}`}
            >
              <span className="alert-dot" />
              <div className="alert-copy">
                <strong>{notification.title}</strong>
                <p>{notification.body}</p>
                <small>{notification.time}</small>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );

  const renderContent = () => {
    if (activeTab === "alerts") {
      return renderNotifications();
    }

    if (typeof children === "function") {
      return children({
        activeTab,
        setActiveTab: selectTab,
        role: roleKey,
      });
    }

    return children;
  };

  return (
    <div className="portal-shell portal-premium-theme">
      {mobileMenuOpen && (
        <button
          type="button"
          className="portal-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <aside className={`portal-sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <div className="portal-sidebar-head">
          <button
            type="button"
            className="portal-brand"
            onClick={() => selectTab(navigation[0].id)}
            aria-label="Open dashboard"
          >
            <span className="brand-dot">
              <Droplets size={19} />
            </span>
            <span>
              VitalConnect
              <strong>AI</strong>
            </span>
          </button>

          <button
            type="button"
            className="portal-mobile-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <section className="portal-role-tag">
          <small>{ROLE_LABELS[roleKey].toUpperCase()}</small>
          <div className="portal-role-profile">
            <span>{initials}</span>
            <div>
              <h3>{displayName}</h3>
              <p>{subtitle}</p>
            </div>
          </div>
        </section>

        <nav
          className="portal-nav"
          aria-label={`${ROLE_LABELS[roleKey]} navigation`}
        >
          {navigation.map(({ id, label, icon: NavigationIcon }) => (
            <button
              type="button"
              key={id}
              className={`nav-tab-btn ${activeTab === id ? "active" : ""}`}
              onClick={() => selectTab(id)}
            >
              <span className="nav-icon">
                <NavigationIcon size={18} />
              </span>
              <span>{label}</span>
              {id === "alerts" && unreadAlerts > 0 && (
                <span className="nav-badge">{unreadAlerts}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="portal-sidebar-footer">
          <div className="portal-security">
            <span>
              <ShieldAlert size={15} />
            </span>
            <div>
              <strong>Secure workspace</strong>
              <small>Session protected</small>
            </div>
          </div>

          <button
            type="button"
            className="portal-logout-btn"
            onClick={onBack}
          >
            <LogOut size={17} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <section className="portal-main">
        <header className="portal-topbar">
          <div className="portal-topbar-left">
            <button
              type="button"
              className="portal-menu-button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>

            <div className="portal-breadcrumb">
              <span>{ROLE_LABELS[roleKey]}</span>
              <ChevronRight size={14} />
              <strong className="active-label">{activeNavigation.label}</strong>
            </div>
          </div>

          <div className="portal-user-meta">
            <button
              type="button"
              className="icon-badge-btn"
              onClick={() => selectTab("alerts")}
              aria-label="Open notifications"
            >
              <Bell size={18} />
              {unreadAlerts > 0 && <i className="ping-dot" />}
            </button>

            <button
              type="button"
              className="user-avatar-pill"
              onClick={() => selectTab(navigation[0].id)}
            >
              <span className="dp-letter">{initials}</span>
              <span className="user-profile-copy">
                <strong>{displayName}</strong>
                <small>{ROLE_LABELS[roleKey]}</small>
              </span>
            </button>
          </div>
        </header>

        <main className="portal-content-body">
          <div className="portal-view-transition" key={activeTab}>
            {renderContent()}
          </div>
        </main>
      </section>

      <VitalAIAssistant user={user} context={`${roleKey} portal`} />
    </div>
  );
}