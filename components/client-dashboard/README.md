Below is a **proper functional breakdown** of the **Client Dashboard** for Goud Echo. This is written at **product + implementation level**, so it can be handed directly to design and engineering without reinterpretation.

---

# Client Dashboard — Detailed Breakdown

## 0. Entry Point & Layout

**Access**

* Authenticated client only
* Default landing page after login: **My Appointments**

**Global UI Elements**

* Top navigation:

  * My Appointments
  * Book New Echo
  * Results & Media
  * Profile
* Notification indicator (email/SMS reminders mirrored in-app)
* Emergency / contact CTA (clearly not for medical emergencies)

---

## A. My Appointments

### Purpose

Give the client **complete clarity** about what is booked, what has happened, and what they can still change.

### Data Shown (Per Appointment)

* Echo type (e.g. 13-week screening, 20-week echo, 3D echo)
* Date & start time
* Location (address + map link)
* Assigned sonographer (first name only, optional)
* Status badge:

  * Upcoming
  * Completed
  * Cancelled
  * No-show (hidden unless relevant)

### Actions

* **Reschedule**

  * Enabled only within allowed policy window
  * Opens availability picker filtered to same echo type
* **Cancel**

  * Requires confirmation
  * Shows cancellation policy clearly
* **Add to calendar**

  * ICS file (Google, Apple, Outlook compatible)

### System Rules

* Past appointments: read-only
* Cancellation disabled inside restricted window
* Medical screenings show extra warning text

---

## B. Book New Echo

### Purpose

Allow safe self-booking **without medical misuse or confusion**.

---

## C. Medical Information & Consent

### Purpose

Make medical compliance **transparent but non-intimidating**.

### Sections

* Pregnancy details:

  * Estimated Due Date (EDD)
  * Current gestational age (auto-calculated)
* Consent records:

  * 13-week screening consent (status + date)
  * Other medical consents
* Referral documents:

  * Uploaded files
  * Status: pending / approved / rejected

### Client Actions

* Upload referral (PDF / image)
* View consent text (read-only)
* Re-confirm consent if expired

### System Rules

* Editing pregnancy data may be restricted after first booking
* Consent changes logged and auditable

---

## D. Results & Media

### Purpose

Provide value without crossing diagnostic or legal boundaries.

### Content Types

* Echo images (JPEG)
* Videos (MP4, short clips)
* Non-diagnostic notes (if allowed)

### UX Rules

* Clear disclaimer: “Not a medical diagnosis”
* Watermarked media (optional)
* Secure download links (expiring URLs)

### Client Actions

* View media gallery per appointment
* Download files
* Share via secure link (optional, time-limited)

### System Rules

* Medical screening results may be limited or excluded
* Abnormal findings never shown directly (redirect to care provider)

---

## E. Profile & Preferences

### Purpose

Let clients manage personal data **without risking data integrity**.

### Editable Fields

* Name
* Phone number
* Notification preferences:

  * Email reminders
  * SMS reminders

### Semi-Locked Fields

* Pregnancy details (EDD)
* Parity / pregnancy count (if collected)


---

## Explicit Exclusions (Hard Rules)

Clients must **never** see:

* Internal notes
* Full staff schedules
* Capacity or availability logic
* Financial breakdowns beyond their own bookings
* Other clients’ data

These are enforced at:

* UI level
* API level
* Supabase RLS level

---

## Technical Mapping (Quick Reference)

| Feature       | Data Source      |
| ------------- | ---------------- |
| Appointments  | bookings table   |
| Echo types    | services table   |
| Media         | Supabase Storage |
| Consent       | consents table   |
| Referrals     | documents table  |
| Notifications | events + Resend  |

---

## Final Product Insight

A good client dashboard:

* Reduces phone calls
* Prevents incorrect bookings
* Builds trust
* Minimizes legal exposure

A bad one:

* Creates medical risk
* Increases admin load
* Breaks compliance