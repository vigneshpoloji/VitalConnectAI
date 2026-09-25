import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Droplets,
  Loader2,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  X,
  Users,
} from "lucide-react";
import VitalAIAssistant from "../../components/VitalAIAssistant";
import { apiService } from "../../services/api";
import "./BloodCampsPage.css";

export default function BloodCampsPage({ onBack }) {
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bookedCamps, setBookedCamps] = useState({});
  const [showHostModal, setShowHostModal] = useState(false);
  const [selectedCampForBooking, setSelectedCampForBooking] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [isSubmittingHost, setIsSubmittingHost] = useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // Form state for Slot Reservation
  const [donorName, setDonorName] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [donorBloodGroup, setDonorBloodGroup] = useState("O+");
  const [slotTime, setSlotTime] = useState("10:00 AM - 11:00 AM");

  // Form state for Hosting a Camp proposal
  const [formData, setFormData] = useState({
    campName: "",
    organizer: "",
    date: "",
    donors: "50",
    venue: "",
    district: "Kamareddy",
  });

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // Fetch only Admin-sanctioned / Medically Verified camps
  const loadPublishedCamps = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.getCamps();
      const campsData = data?.camps || data?.data || [];

      if (data?.success && Array.isArray(campsData)) {
        // Exclusively display clinically accredited drives
        const sanctionedOnly = campsData.filter(
          (c) =>
            c.status === "Medically Verified" ||
            c.status === "Active Today" ||
            c.status === "Verified"
        );

        const mappedCamps = sanctionedOnly.map((c, index) => ({
          _id: c._id || c.id || `CAMP-${index + 101}`,
          id: c._id || c.id || `CAMP-${index + 101}`,
          title: c.campName || c.title || "Regional Blood Drive",
          campName: c.campName || c.title || "Regional Blood Drive",
          organizer: c.organizer || "Authorized Medical Partner",
          preferredDate: c.preferredDate,
          date: c.preferredDate
            ? new Date(c.preferredDate)
                .toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
                .toUpperCase()
            : c.date || "UPCOMING",
          day: c.preferredDate
            ? new Date(c.preferredDate).toLocaleDateString("en-US", { weekday: "long" })
            : c.day || "Scheduled",
          time: c.time || "9:00 AM – 5:00 PM",
          venue: c.venue || "Community Centre",
          area: c.district || c.area || "Kamareddy",
          district: c.district || c.area || "Kamareddy",
          slotsTotal: Number(c.expectedDonors || c.slotsTotal || 100),
          slotsBooked: Array.isArray(c.attendees)
            ? c.attendees.length
            : Number(c.slotsBooked || 0),
          attendees: c.attendees || [],
          badge: c.badge || "Sanctioned Drive",
          status: c.status || "Medically Verified",
          description:
            c.description ||
            `Hospital-supervised collection drive organized by ${
              c.organizer || "local authorities"
            }. Equipped with cold-chain storage and certified phlebotomy units.`,
        }));

        setCamps(mappedCamps);
      } else {
        setCamps([]);
      }
    } catch (err) {
      console.error("Failed to load blood camps from backend:", err);
      setCamps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPublishedCamps();
  }, [loadPublishedCamps]);

  // Handle detailed slot reservation submission
  const handleBookSlot = async (e) => {
    e.preventDefault();
    if (!selectedCampForBooking) return;

    setIsSubmittingBooking(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/camps/${selectedCampForBooking._id}/book-slot`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            donorName: donorName.trim(),
            donorPhone: donorPhone.trim(),
            donorBloodGroup,
            slotTime,
          }),
        }
      );

      const data = await res.json();
      if (data.success) {
        triggerToast(`Slot reserved successfully for ${donorName}!`);
        setBookedCamps((prev) => ({
          ...prev,
          [selectedCampForBooking._id]: true,
        }));
        setSelectedCampForBooking(null);
        setDonorName("");
        setDonorPhone("");
        loadPublishedCamps();
      } else {
        alert(data.message || "Slot reservation failed.");
      }
    } catch (err) {
      console.error("Slot reservation request failed:", err);
      alert("Error reserving slot. Please check backend connection.");
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Submit camp proposal for Admin Accreditation
  const handleCampSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingHost(true);

    try {
      const res = await apiService.hostCamp({
        campName: formData.campName,
        organizer: formData.organizer,
        preferredDate: formData.date,
        expectedDonors: Number(formData.donors),
        venue: formData.venue,
        district: formData.district || "Kamareddy",
      });

      if (res?.success) {
        triggerToast("Camp proposal submitted! Awaiting Admin medical verification.");
        setShowHostModal(false);
        setFormData({
          campName: "",
          organizer: "",
          date: "",
          donors: "50",
          venue: "",
          district: "Kamareddy",
        });
        await loadPublishedCamps();
      } else {
        alert(res?.message || "Submission failed. Please check form values.");
      }
    } catch (err) {
      alert("Server error while submitting camp proposal. Ensure backend is active.");
      console.error(err);
    } finally {
      setIsSubmittingHost(false);
    }
  };

  const filteredCamps = camps.filter(
    (c) =>
      c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.venue?.toLowerCase().includes(search.toLowerCase()) ||
      c.area?.toLowerCase().includes(search.toLowerCase()) ||
      c.organizer?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main
      className="luxury-camps-page"
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(to bottom, #c2410c 0%, #ea580c 24%, #f97316 42%, #fb923c 48%, #ffffff 52%, #ffffff 100%)",
        backgroundColor: "#ea580c",
        color: "#1c1917",
      }}
    >
      <div
        className="ambient-luxury ambient-left"
        style={{
          background:
            "radial-gradient(circle, rgba(251, 146, 60, 0.45), transparent 70%)",
        }}
      />
      <div
        className="ambient-luxury ambient-right"
        style={{
          background:
            "radial-gradient(circle, rgba(254, 215, 170, 0.5), transparent 70%)",
        }}
      />

      {/* Navigation Header */}
      <div className="shell camps-nav-bar">
        <button type="button" className="camps-back-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Return to Network</span>
        </button>

        <div className="camps-brand-pill">
          <span className="brand-dot">
            <Droplets size={16} />
          </span>
          <span>
            VitalConnect <span>AI · Camps</span>
          </span>
        </div>

        <button
          type="button"
          className="camps-host-btn"
          onClick={() => setShowHostModal(true)}
        >
          <Plus size={15} />
          <span>Host a Camp</span>
        </button>
      </div>

      {/* Hero Header */}
      <section className="shell camps-hero">
        <span className="camps-kicker">
          <ShieldCheck size={13} /> Certified Regional Blood Camps
        </span>

        <h1>
          A collective heartbeat.
          <br />
          <em>Every drop accounted for.</em>
        </h1>

        <p className="camps-hero-copy">
          Discover hospital-backed, high-integrity donation drives. Reserve your
          intake slot, review cold-chain protocols, or register a community drive
          for clinical review.
        </p>

        {/* Search & Accreditations Panel */}
        <div className="camps-search-panel">
          <div className="search-field">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by venue, city hub, or hospital organizer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="stats-badges">
            <span>
              <CheckCircle2 size={15} /> 100% Medically Accredited
            </span>
            <span>
              <Clock size={15} /> Direct Trauma Supply
            </span>
          </div>
        </div>
      </section>

      {/* Verified Camps Grid */}
      <section className="shell camps-showcase">
        <div className="section-title-row">
          <div>
            <h3>Approved Community Donation Drives</h3>
            <p>Clinically authorized and supervised blood collection camps</p>
          </div>
          <span className="total-pill">
            {filteredCamps.length} Drives Verified
          </span>
        </div>

        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#64748b" }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: "0 auto 12px" }} />
            <p>Loading official camp schedule...</p>
          </div>
        ) : filteredCamps.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #fed7aa",
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.04)",
            }}
          >
            <ShieldCheck size={36} color="#ea580c" style={{ margin: "0 auto 10px" }} />
            <h4 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 700 }}>
              No Sanctioned Camps Found
            </h4>
            <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>
              {search
                ? "No approved drives match your search query."
                : "All submitted drives are currently undergoing clinical review. Submit one to host in your district!"}
            </p>
          </div>
        ) : (
          <div className="camps-grid">
            {filteredCamps.map((camp) => {
              const slotsLeft = Math.max(0, camp.slotsTotal - camp.slotsBooked);
              const progress = Math.min(
                100,
                (camp.slotsBooked / (camp.slotsTotal || 1)) * 100
              );
              const isBooked = bookedCamps[camp._id];
              const dateParts = camp.date?.includes(" ")
                ? camp.date.split(" ")
                : ["15", "OCT", "2026"];

              return (
                <article key={camp._id} className="camp-luxury-card">
                  <div className="card-glass-glow" />
                  <div className="camp-header">
                    <span className="camp-badge">{camp.badge}</span>
                    <span className="camp-status">
                      <i /> {camp.status}
                    </span>
                  </div>

                  <div className="camp-calendar-row">
                    <div className="date-block">
                      <span className="month">{dateParts[1] || "EXP"}</span>
                      <strong className="day-num">{dateParts[0] || "01"}</strong>
                      <small className="day-name">{camp.day}</small>
                    </div>
                    <div className="meta-text">
                      <h4>{camp.title}</h4>
                      <span className="org-label">
                        <Building2 size={13} /> {camp.organizer}
                      </span>
                    </div>
                  </div>

                  <p className="camp-desc">{camp.description}</p>

                  <div className="details-stack">
                    <div>
                      <Clock size={14} />
                      <span>{camp.time}</span>
                    </div>
                    <div>
                      <MapPin size={14} />
                      <span>
                        {camp.venue} ({camp.area})
                      </span>
                    </div>
                    <div>
                      <Users size={14} />
                      <span>
                        {camp.slotsBooked} registered ({camp.slotsTotal} capacity)
                      </span>
                    </div>
                  </div>

                  <div className="camp-slot-status">
                    <div className="slot-labels">
                      <span>Capacity Progress</span>
                      <strong>{slotsLeft} slots remaining</strong>
                    </div>
                    <div className="slot-bar">
                      <span style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`reserve-slot-btn ${isBooked ? "booked" : ""}`}
                    onClick={() => setSelectedCampForBooking(camp)}
                    disabled={isBooked || slotsLeft <= 0}
                  >
                    {isBooked ? (
                      <>
                        <CalendarCheck size={16} /> Spot Reserved
                      </>
                    ) : slotsLeft <= 0 ? (
                      "Camp At Capacity"
                    ) : (
                      <>
                        Reserve Priority Slot <ArrowUpRight size={16} />
                      </>
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Reserve Slot Modal */}
      {selectedCampForBooking && (
        <div
          className="camp-modal-overlay"
          onClick={() => setSelectedCampForBooking(null)}
          style={{ zIndex: 1000 }}
        >
          <div
            className="camp-modal-window"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "460px" }}
          >
            <button
              type="button"
              className="camp-modal-close"
              onClick={() => setSelectedCampForBooking(null)}
            >
              <X size={20} />
            </button>

            <span className="modal-tag">DONATION TIME RESERVATION</span>
            <h2>Reserve Donation Slot</h2>
            <p className="modal-desc" style={{ marginBottom: "16px" }}>
              Confirm your visit to <strong>{selectedCampForBooking.campName}</strong> at{" "}
              {selectedCampForBooking.venue}.
            </p>

            <form
              onSubmit={handleBookSlot}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div className="modal-field">
                <label>Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Poloji Vignesh"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                />
              </div>

              <div className="modal-field">
                <label>Contact Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 75698 76200"
                  value={donorPhone}
                  onChange={(e) => setDonorPhone(e.target.value)}
                />
              </div>

              <div className="modal-field-row">
                <div className="modal-field">
                  <label>Blood Group</label>
                  <select
                    value={donorBloodGroup}
                    onChange={(e) => setDonorBloodGroup(e.target.value)}
                    style={{
                      height: "46px",
                      borderRadius: "10px",
                      border: "1px solid #fed7aa",
                      padding: "0 12px",
                      outline: "none",
                      backgroundColor: "#fff",
                    }}
                  >
                    {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="modal-field">
                  <label>Time Slot</label>
                  <select
                    value={slotTime}
                    onChange={(e) => setSlotTime(e.target.value)}
                    style={{
                      height: "46px",
                      borderRadius: "10px",
                      border: "1px solid #fed7aa",
                      padding: "0 12px",
                      outline: "none",
                      backgroundColor: "#fff",
                    }}
                  >
                    <option value="09:00 AM - 10:00 AM">09:00 AM - 10:00 AM</option>
                    <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</option>
                    <option value="11:00 AM - 12:00 PM">11:00 AM - 12:00 PM</option>
                    <option value="01:00 PM - 02:00 PM">01:00 PM - 02:00 PM</option>
                    <option value="02:00 PM - 03:00 PM">02:00 PM - 03:00 PM</option>
                    <option value="03:00 PM - 04:00 PM">03:00 PM - 04:00 PM</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions-row" style={{ marginTop: "8px" }}>
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={() => setSelectedCampForBooking(null)}
                  disabled={isSubmittingBooking}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-submit-btn glow-on-hover"
                  disabled={isSubmittingBooking}
                >
                  <span
                    className="btn-label"
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    {isSubmittingBooking ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Confirming...
                      </>
                    ) : (
                      "Confirm Slot Reservation"
                    )}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Host a Camp Modal */}
      {showHostModal && (
        <div className="camp-modal-overlay" onClick={() => setShowHostModal(false)}>
          <div className="camp-modal-window" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="camp-modal-close"
              onClick={() => setShowHostModal(false)}
            >
              <X size={20} />
            </button>

            <span className="modal-tag">COMMUNITY PARTNERSHIP</span>
            <h2>Host a Verified Blood Camp</h2>
            <p className="modal-desc">
              Partner with VitalConnectAI certified hospitals to bring an accredited
              collection drive to your campus, company, or residential society.
            </p>

            <form className="modal-form-grid" onSubmit={handleCampSubmit}>
              <div className="modal-field">
                <label>Drive / Camp Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Campus Annual Donation Drive"
                  value={formData.campName}
                  onChange={(e) =>
                    setFormData({ ...formData, campName: e.target.value })
                  }
                />
              </div>

              <div className="modal-field">
                <label>Organization</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Tech Forum / Corporate CSR"
                  value={formData.organizer}
                  onChange={(e) =>
                    setFormData({ ...formData, organizer: e.target.value })
                  }
                />
              </div>

              <div className="modal-field-row">
                <div className="modal-field">
                  <label>Preferred Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                  />
                </div>
                <div className="modal-field">
                  <label>Expected Donors</label>
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    required
                    value={formData.donors}
                    onChange={(e) =>
                      setFormData({ ...formData, donors: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="modal-field">
                <label>District / Area</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Kamareddy, Nizamabad, Gandhari"
                  value={formData.district}
                  onChange={(e) =>
                    setFormData({ ...formData, district: e.target.value })
                  }
                />
              </div>

              <div className="modal-field">
                <label>Venue / Address</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Full location details and accessibility notes..."
                  value={formData.venue}
                  onChange={(e) =>
                    setFormData({ ...formData, venue: e.target.value })
                  }
                />
              </div>

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={() => setShowHostModal(false)}
                  disabled={isSubmittingHost}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-submit-btn glow-on-hover"
                  disabled={isSubmittingHost}
                >
                  <span
                    className="btn-label"
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    {isSubmittingHost ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Submitting...
                      </>
                    ) : (
                      "Submit for Verification"
                    )}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="camps-toast">
          <CheckCircle2 size={18} />
          <span>{toastMsg}</span>
        </div>
      )}

      <VitalAIAssistant context="blood camps directory" />
    </main>
  );
}