// booking.js v5 — RPC for duplicate check + EmailJS for student emails
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.0/+esm";

const supabase = createClient(
  "https://utpwbrbpdyrwqlheaknm.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0cHdicmJwZHlyd3FsaGVha25tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMzczNDEsImV4cCI6MjA5MDkxMzM0MX0.NThOb2kXgbz85s0kunWhSjblM8I_PjvE3byyhEzQB8U"
);

// ── EmailJS config — must match your EmailJS dashboard ──────
const EMAILJS_SERVICE_ID  = "service_6ptnn6y";
const EMAILJS_TEMPLATE_ID = "template_ii0iyl7";
const EMAILJS_PUBLIC_KEY  = "IAT9RRoctOp4m";
const ADMIN_EMAIL         = "mailtsjp@gmail.com";
// ────────────────────────────────────────────────────────────

window._supabase = supabase;

// ── Send email via EmailJS ───────────────────────────────────
async function sendEmail(toEmail, toName, params) {
  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id:  EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id:     EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email: toEmail,
        to_name:  toName,
        ...params
      }
    })
  });
  const txt = await res.text();
  console.log("[EmailJS] →", toEmail, ":", res.status, txt);
  return { status: res.status, text: txt };
}

// ── Main booking function ────────────────────────────────────
window.bookClass = async function({ classId, classTitle, classType, classStart, classEnd, instructor, studentInfo, btn }) {
  btn.disabled    = true;
  btn.textContent = "Booking...";

  try {
    // Step 1: Use RPC — returns JSON, never throws 409
    const { data: result, error: rpcErr } = await supabase
      .rpc("safe_book_class", {
        p_class_id:      classId,
        p_student_name:  studentInfo.name,
        p_student_email: studentInfo.email,
        p_student_phone: studentInfo.phone || null
      });

    if (rpcErr) {
      btn.disabled    = false;
      btn.textContent = "Book this class";
      alert("Booking error: " + rpcErr.message);
      return;
    }

    if (result && result.reason === "duplicate") {
      btn.disabled         = false;
      btn.textContent      = "Already Booked";
      btn.style.background = "#FF9800";
      const classDate = new Date(classStart).toLocaleDateString("default", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
      });
      alert(
        "You're already registered for this class!\n\n" +
        "Class: " + classTitle + "\n" +
        "Date: " + classDate + "\n" +
        "Email: " + studentInfo.email + "\n\n" +
        "Each class can only be booked once per person.\n" +
        "To change your booking, please contact us directly."
      );
      return;
    }

    // Step 2: Send emails via EmailJS
    const fmtEmail = function(iso) {
      return new Date(iso).toLocaleString("en-SG", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
    };

    const emailParams = {
      student_name:  studentInfo.name,
      student_phone: studentInfo.phone || "—",
      class_title:   classTitle,
      class_type:    classType || "—",
      instructor:    instructor,
      start_time:    fmtEmail(classStart),
      end_time:      fmtEmail(classEnd)
    };

    // Send to student
    sendEmail(studentInfo.email, studentInfo.name, emailParams)
      .then(function(r) {
        if (r.status !== 200) {
          console.warn("[EmailJS] Student email failed:", r.status, r.text);
        }
      })
      .catch(function(e) { console.warn("[EmailJS] Student send error:", e.message); });

    // Send to admin
    sendEmail(ADMIN_EMAIL, "Admin", emailParams)
      .catch(function(e) { console.warn("[EmailJS] Admin send error:", e.message); });

    // Step 3: Show success
    btn.textContent      = "Booked!";
    btn.style.background = "#388E3C";
    btn.disabled         = false;

    const startStr = new Date(classStart).toLocaleString("default", {
      weekday: "long", day: "numeric", month: "long",
      hour: "2-digit", minute: "2-digit"
    });
    alert(
      "Booking confirmed!\n\n" +
      "Class: " + classTitle + (classType ? " (" + classType + ")" : "") + "\n" +
      "Instructor: " + instructor + "\n" +
      "Date: " + startStr + "\n\n" +
      "A confirmation email has been sent to: " + studentInfo.email
    );

  } catch (err) {
    btn.disabled    = false;
    btn.textContent = "Book this class";
    console.error("[Booking error]", err);
    var msg = err.message || "";
    if (msg.includes("duplicate") || msg.includes("23505") || msg.includes("bookings_class_email_unique")) {
      btn.textContent      = "Already Booked";
      btn.style.background = "#FF9800";
      alert(
        "You're already registered for this class!\n\n" +
        "Email: " + studentInfo.email + "\n\n" +
        "Each class can only be booked once per person."
      );
    } else {
      alert("An unexpected error occurred. Please try again.\n\n" + msg);
    }
  }
};
