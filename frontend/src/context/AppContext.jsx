import { createContext, useContext, useState } from "react";

const AppContext = createContext();

export function AppProvider({ children }) {
  // Shared Blood Requests
  const [requests, setRequests] = useState([
    {
      id: "REQ-901",
      hospital: "CityCare Hospital",
      group: "O-",
      component: "Packed RBC",
      units: 2,
      priority: "Critical",
      status: "Pending",
      area: "Indiranagar",
      distance: "3.2 km",
      time: "5 mins ago",
    },
    {
      id: "REQ-902",
      hospital: "Mercy Multi-Speciality",
      group: "A+",
      component: "Platelets",
      units: 4,
      priority: "Urgent",
      status: "Pending",
      area: "Koramangala",
      distance: "6.8 km",
      time: "14 mins ago",
    },
  ]);

  // Shared Inventory across Blood Banks
  const [inventory, setInventory] = useState([
    { group: "O+", units: 28, status: "Optimal" },
    { group: "O-", units: 3, status: "Critical" },
    { group: "A+", units: 19, status: "Optimal" },
    { group: "A-", units: 6, status: "Moderate" },
    { group: "B+", units: 22, status: "Optimal" },
    { group: "B-", units: 5, status: "Moderate" },
    { group: "AB+", units: 12, status: "Optimal" },
    { group: "AB-", units: 2, status: "Critical" },
  ]);

  // User Accounts Managed by Admin
  const [users, setUsers] = useState([
    { id: "USR-01", name: "Alex Morgan", role: "Donor", email: "alex@vital.com", status: "Active" },
    { id: "USR-02", name: "CityCare Hospital", role: "Hospital", email: "citycare@hosp.in", status: "Active" },
    { id: "USR-03", name: "LifeLine Blood Centre", role: "Blood Bank", email: "contact@lifeline.org", status: "Active" },
    { id: "USR-04", name: "Metro General Hosp", role: "Hospital", email: "admin@metrohosp.in", status: "Pending" },
  ]);

  // Central Notification Bell Hub
  const [notifications, setNotifications] = useState({
    donor: [
      { id: 1, title: "Urgent O- Needed Nearby", body: "CityCare Hospital requires 2 units of O- immediately.", time: "5m ago", unread: true },
      { id: 2, title: "Eligibility Restored", body: "You are now eligible to donate whole blood again.", time: "2d ago", unread: false },
    ],
    hospital: [
      { id: 1, title: "Donor Pledged", body: "Alex Morgan pledged to donate for request REQ-901.", time: "2m ago", unread: true },
      { id: 2, title: "Stock Low Alert", body: "Blood Bank O- supply is critically low.", time: "1h ago", unread: false },
    ],
    bloodbank: [
      { id: 1, title: "Critical Inflow Request", body: "CityCare Hospital requesting 2 units O- RBC.", time: "5m ago", unread: true },
      { id: 2, title: "Camp Scheduled", body: "Indiranagar community blood drive confirmed for Saturday.", time: "3h ago", unread: false },
    ],
    admin: [
      { id: 1, title: "Registration Request", body: "Metro General Hosp uploaded clinical accreditation for approval.", time: "12m ago", unread: true },
      { id: 2, title: "Audit Verification", body: "Nightly ledger check completed with 100% integrity.", time: "6h ago", unread: false },
    ],
  });

  const createRequest = (newReq) => {
    setRequests((prev) => [newReq, ...prev]);
    // Push real-time notifications to Donor, Blood Bank, and Hospital
    setNotifications((prev) => ({
      ...prev,
      donor: [
        { id: Date.now(), title: `Emergency Blood Request: ${newReq.group}`, body: `${newReq.hospital} urgently requires ${newReq.units} units (${newReq.priority}).`, time: "Just now", unread: true },
        ...prev.donor,
      ],
      bloodbank: [
        { id: Date.now() + 1, title: `Hospital Dispatch Order: ${newReq.group}`, body: `${newReq.hospital} placed an emergency order for ${newReq.units} units.`, time: "Just now", unread: true },
        ...prev.bloodbank,
      ],
    }));
  };

  const updateInventory = (group, delta) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.group === group ? { ...item, units: Math.max(0, item.units + delta) } : item
      )
    );
  };

  const updateUserStatus = (id, newStatus) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: newStatus } : u))
    );
  };

  return (
    <AppContext.Provider
      value={{
        requests,
        setRequests,
        inventory,
        updateInventory,
        users,
        updateUserStatus,
        notifications,
        createRequest,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);