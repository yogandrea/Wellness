// booking.js v7
// NO Supabase import — uses window._supabase from index.html to avoid duplicate client warning
// EmailJS for confirmation emails

const EMAILJS_SERVICE_ID  = "service_6ptnn6y";
const EMAILJS_TEMPLATE_ID = "template_ii0iyl7";
const EMAILJS_PUBLIC_KEY  = "XHVyvuP_XgMArQeZF";
const ADMIN_EMAIL         = "hellohello.wellness@gmail.com";

async function sendEmailJS(toEmail, toName, params) {
  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id:  EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id:     EMAILJS_PUBLIC_KEY,
        template_params: { to_email: toEmail, to_name: toName, ...params }
      })
    });
    const txt = await res.text();
    console.log("[EmailJS] →", toEmail, ":", res.status, txt);
    return { status: res.status, text: txt };
  } catch (e) {
    console.warn("[EmailJS] failed for", toEmail, ":", e.message);
    return { status: 0, text: e.message };
  }
}

window.bookClass = async function({ classId, classTitle, classType, classStart, classEnd, instructor, studentInfo, btn }) {
  btn.disabled    = true;
  btn.textContent = "Booking...";

  // Use shared supabase from index.html — no new client created here
  const supabase = window._supabase;
  if (!supabase) {
    btn.disabled    = false;
    btn.textContent = "Book this class";
    alert("Booking system not ready. Please refresh and try again.");
    return;
  }

  try {
    const { data: result, error: rpcErr } = await supabase
      .rpc("safe_book_class", {
        p_class_id:      Number(classId),
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

    // Send emails
    const fmt = function(iso) {
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
      start_time:    fmt(classStart),
      end_time:      fmt(classEnd)
    };

    sendEmailJS(studentInfo.email, studentInfo.name, emailParams);
    sendEmailJS(ADMIN_EMAIL, "Admin", emailParams);

    // Show success
    btn.textContent      = "Booked!";
    btn.style.background = "#388E3C";
    btn.disabled         = false;

    alert(
      "Booking confirmed!\n\n" +
      "Class: " + classTitle + (classType ? " (" + classType + ")" : "") + "\n" +
      "Instructor: " + instructor + "\n" +
      "Date: " + new Date(classStart).toLocaleString("default", { weekday:"long", day:"numeric", month:"long", hour:"2-digit", minute:"2-digit" }) + "\n\n" +
      "Confirmation email sent to: " + studentInfo.email
    );

  } catch (err) {
    btn.disabled    = false;
    btn.textContent = "Book this class";
    var msg = err.message || "";
    if (msg.includes("duplicate") || msg.includes("23505") || msg.includes("bookings_class_email_unique")) {
      btn.textContent      = "Already Booked";
      btn.style.background = "#FF9800";
      alert("You're already registered for this class!\n\nEmail: " + studentInfo.email + "\n\nEach class can only be booked once per person.");
    } else {
      alert("Unexpected error. Please try again.\n\n" + msg);
    }
  }
};
