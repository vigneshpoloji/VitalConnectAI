import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Droplets,
  HeartHandshake,
  Hospital,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import "./FeedbackPage.css";

export default function FeedbackPage({ onBack }) {
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState("Donation Experience");
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "Alex Morgan",
    email: "alex@example.com",
    subject: "",
    message: "",
  });

  const categories = [
    "Donation Experience",
    "Hospital & Request Flow",
    "Blood Bank Inventory",
    "Platform & Speed",
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
<main className="feedback-page-wrapper page-half-split-blue">      <header className="feedback-nav shell">
        <button type="button" className="feedback-back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Return to Network
        </button>

        <div className="feedback-brand-pill">
          <span className="brand-dot"><Droplets size={16} /></span>
          VitalConnect<span>AI</span> · Feedback
        </div>
      </header>

      <section className="feedback-content-shell shell">
        <div className="feedback-luxury-card">
          <span className="feedback-kicker">
            <ShieldCheck size={14} /> COMMUNITY INTEGRITY & TRUST
          </span>

          <h1>
            Your perspective shapes
            <br />
            <em>our response.</em>
          </h1>

          <p className="feedback-lede">
            Every critical connection requires continuous refinement. Share your experience
            to help us enhance care coordination across the network.
          </p>

          {submitted ? (
            <div className="feedback-success-card">
              <CheckCircle2 size={44} />
              <h3>Thank you for sharing your perspective</h3>
              <p>Your suggestions have been submitted privately to our governance team.</p>
              <button type="button" className="feedback-submit-btn" onClick={onBack}>
                Return to Network
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="feedback-luxury-form">
              {/* Overall Experience */}
              <div className="form-group-block">
                <label className="section-label">Overall Experience</label>
                <div className="star-rating-row">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      className={`star-btn ${rating >= star ? "active" : ""}`}
                      onClick={() => setRating(star)}
                    >
                      <Star size={24} fill={rating >= star ? "#e11d48" : "none"} />
                    </button>
                  ))}
                  <span className="rating-descriptor">
                    {rating === 5 ? "Extraordinary" : rating === 4 ? "Very Good" : rating === 3 ? "Good" : "Needs Improvement"}
                  </span>
                </div>
              </div>

              {/* Select Feedback Area */}
              <div className="form-group-block">
                <label className="section-label">Select Feedback Area</label>
                <div className="feedback-pills-grid">
                  {categories.map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      className={`feedback-pill-choice ${category === cat ? "selected" : ""}`}
                      onClick={() => setCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name & Email Row */}
              <div className="form-two-col">
                <label>
                  <span>Your Name (Optional)</span>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </label>

                <label>
                  <span>Email Address (Optional)</span>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </label>
              </div>

              {/* Subject */}
              <label className="full-width-label">
                <span>Subject</span>
                <input
                  type="text"
                  placeholder="e.g., Quick response time during emergency dispatch"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                />
              </label>

              {/* Detailed Thoughts */}
              <label className="full-width-label">
                <span>Detailed Thoughts or Recommendations</span>
                <textarea
                  rows={5}
                  placeholder="Share details regarding your experience with donor matching, dispatch clarity, or verification..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                />
              </label>

              <div className="form-footer-action">
                <span className="privacy-note">
                  <ShieldCheck size={14} /> Submitted privately to the governance team
                </span>

                <button type="submit" className="feedback-submit-btn">
                  Submit Feedback <Send size={16} />
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}