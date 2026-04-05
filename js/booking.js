// booking.js v4 — uses safe_book_class RPC to avoid 409 errors
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.0/+esm";

const supabase = createClient(
  "https://utpwbrbpdyrwqlheaknm.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0cHdicmJwZHlyd3FsaGVha25tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMzczNDEsImV4cCI6MjA5MDkxMzM0MX0.NThOb2kXgbz85s0kunWhSjblM8I_PjvE3byyhEzQB8U"
);

const EDGE_URL  = "https://utpwbrbpdyrwqlheaknm.supabase.co/functions/v1/super-worker";
const EDGE_AUTH = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0cHdicmJwZHlyd3FsaGVha25tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMzczNDEsImV4cCI6MjA5MDkxMzM0MX0.NThOb2kXgbz85s0kunWhSjblM8I_PjvE3byyhEzQB8U";

window._supabase = supabase;

window.bookClass = async function({ classId, classTitle, classType, classStart, classEnd, instructor, studentInfo, btn }) {
  btn.disabled    = true;
  btn.textContent = "Booking...";

  try {
    // Use RPC which returns JSON result instead of throwing on duplicate
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

    // Send email notification (fire and forget)
    fetch(EDGE_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Authorization": EDGE_AUTH },
      body: JSON.stringify({
        student_name:  studentInfo.name,
        student_email: studentInfo.email,
        student_phone: studentInfo.phone || "",
        class_title:   classTitle,
        class_type:    classType || "",
        instructor:    instructor,
        start_time:    classStart,
        end_time:      classEnd
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) { console.log("[Email]", JSON.stringify(d)); })
    .catch(function(e) { console.warn("[Email failed]", e.message); });

    // Show success
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
      "A confirmation has been sent to: " + studentInfo.email
    );

  } catch (err) {
    btn.disabled    = false;
    btn.textContent = "Book this class";
    console.error("[Booking error]", err);
    // Check if it's a duplicate disguised as an exception
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
