"use client";

import React, { useState } from "react";
import { ShieldCheck, Info, Sparkles, Home, CheckCircle2 } from "lucide-react";
import styles from "./page.module.css";

export default function UniStay() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    whatsapp: "",
    message: ""
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("https://formspree.io/f/xldonynj", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          WhatsApp: formData.whatsapp,
          message: formData.message
        })
      });
      if (response.ok) {
        setIsSubmitted(true);
        setFormData({ name: "", email: "", whatsapp: "", message: "" });
      }
    } catch {
      alert("Oops! There was a problem submitting your form.");
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className="badge" style={{
            background: "rgba(255, 255, 255, 0.1)",
            color: "var(--color-accent)",
            padding: "6px 14px",
            borderRadius: "20px",
            fontSize: "13px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "1px"
          }}>
            Trusted Student Housing
          </span>
          <h1 className={styles.heroTitle}>Find Verified Student and Professional Housing in Germany</h1>
          <p className={styles.heroSubtitle}>
            Book trusted rooms directly with UniStay and secure safe, comfortable, and well-located accommodations before you arrive.
          </p>
          <a
            href="/unistay/browse"
            className={styles.heroBtn}
          >
            Enquire For Rooms
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Everything You Need for a Smooth Arrival</h2>
          </div>

          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <ShieldCheck size={28} />
              </div>
              <h3 className={styles.featureTitle}>Verified Housing</h3>
              <p className={styles.featureDescription}>
                Book UniStay-managed rooms or through our vetted partners in Germany with full legal contract compliance.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Info size={28} />
              </div>
              <h3 className={styles.featureTitle}>Arrival & City Guides</h3>
              <p className={styles.featureDescription}>
                Access our detailed step-by-step checklists and PDF guides for city registration (Anmeldung), SIM cards, and local banking setup.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Sparkles size={28} />
              </div>
              <h3 className={styles.featureTitle}>AI Orientation Assistant</h3>
              <p className={styles.featureDescription}>
                Get real-time, interactive answers to any relocation, neighborhood, transport, or university question via our custom AI platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className={styles.process}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Our Booking Process</h2>
            <p style={{ color: "var(--text-secondary)", marginTop: "12px" }}>
              From initial room search to move-in day, we make renting abroad safe, transparent, and effortless.
            </p>
          </div>

          <div className={styles.timeline}>
            <div className={styles.timelineItem}>
              <div className={styles.timelineContent}>
                <h3 className={styles.timelineHeading}>1. Enquire for a Room</h3>
                <p className={styles.timelineText}>Submit your preferences (budget, city, dates) and let our advisory team source matching vacancies.</p>
              </div>
            </div>

            <div className={styles.timelineItem}>
              <div className={styles.timelineContent}>
                <h3 className={styles.timelineHeading}>2. Virtual or In-person Tour</h3>
                <p className={styles.timelineText}>Review high-definition virtual tours, structural photos, or send a local proxy for in-person inspection.</p>
              </div>
            </div>

            <div className={styles.timelineItem}>
              <div className={styles.timelineContent}>
                <h3 className={styles.timelineHeading}>3. Book Instantly</h3>
                <p className={styles.timelineText}>Validate lease contracts compliant with German housing laws and book securely via digital deposit escrow.</p>
              </div>
            </div>

            <div className={styles.timelineItem}>
              <div className={styles.timelineContent}>
                <h3 className={styles.timelineHeading}>4. Plan Your Arrival</h3>
                <p className={styles.timelineText}>Coordinate airport transfers, request move-in support, and pre-book local orientation packs through UniStay.</p>
              </div>
            </div>

            <div className={styles.timelineItem}>
              <div className={styles.timelineContent}>
                <h3 className={styles.timelineHeading}>5. Move In with Confidence</h3>
                <p className={styles.timelineText}>Arrive in Germany, pick up your keys, sign the hand-over protocol (Übergabeprotokoll), and settle in!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section style={{ padding: "100px 24px", background: "var(--bg-primary)", borderTop: "1px solid var(--border-light)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "60px", maxWidth: "1200px", margin: "0 auto", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "32px", fontWeight: 800, color: "var(--color-primary)", marginBottom: "20px" }}>Secure Your Housing Today</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "30px", fontSize: "16px", lineHeight: 1.7 }}>
              Rooms in popular German university cities fill up months in advance. Fill out the application form with your details to start the booking queue.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", gap: "16px", alignItems: "center", background: "var(--bg-secondary)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
                <Home style={{ color: "var(--color-primary)" }} />
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Offices</div>
                  <div style={{ fontSize: "14px", fontWeight: 700 }}>Neumarkt i.d.OPf., Germany</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "16px", alignItems: "center", background: "var(--bg-secondary)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
                <CheckCircle2 style={{ color: "var(--color-primary)" }} />
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Legal Contracts</div>
                  <div style={{ fontSize: "14px", fontWeight: 700 }}>100% German Law Compliant</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: "var(--bg-secondary)", padding: "40px", borderRadius: "16px", border: "1px solid var(--border-light)", boxShadow: "var(--shadow-lg)" }}>
            {isSubmitted ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <span style={{ fontSize: "48px" }}>🏠</span>
                <h3 style={{ fontSize: "22px", margin: "20px 0 10px", color: "var(--color-primary)" }}>Application Received!</h3>
                <p style={{ color: "var(--text-secondary)" }}>Thank you! A UniStay housing advisor will reach out to you on WhatsApp or email with initial listings within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label htmlFor="name" style={{ fontSize: "14px", fontWeight: 600 }}>Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    style={{ padding: "12px", borderRadius: "6px", border: "1px solid var(--border-light)", background: "var(--bg-primary)" }}
                    placeholder="Your Name"
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label htmlFor="email" style={{ fontSize: "14px", fontWeight: 600 }}>Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    style={{ padding: "12px", borderRadius: "6px", border: "1px solid var(--border-light)", background: "var(--bg-primary)" }}
                    placeholder="Your Email"
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label htmlFor="whatsapp" style={{ fontSize: "14px", fontWeight: 600 }}>WhatsApp Number</label>
                  <input
                    type="tel"
                    id="whatsapp"
                    name="whatsapp"
                    required
                    value={formData.whatsapp}
                    onChange={handleInputChange}
                    style={{ padding: "12px", borderRadius: "6px", border: "1px solid var(--border-light)", background: "var(--bg-primary)" }}
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label htmlFor="message" style={{ fontSize: "14px", fontWeight: 600 }}>Preferred City & Budget</label>
                  <textarea
                    id="message"
                    name="message"
                    rows={3}
                    required
                    value={formData.message}
                    onChange={handleInputChange}
                    style={{ padding: "12px", borderRadius: "6px", border: "1px solid var(--border-light)", background: "var(--bg-primary)" }}
                    placeholder="e.g. Munich, Max budget €650/month, start date Sept 1st"
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    padding: "14px",
                    background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
                    color: "var(--color-white)",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(100, 57, 255, 0.15)"
                  }}
                >
                  Send Housing Enquiry
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
