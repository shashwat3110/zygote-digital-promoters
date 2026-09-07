// server.js
// ------------------------------------------------------------------
// This is the "backend" of the site. For a mostly-content site like
// this, the backend has one real job: receive the Contact form
// submission, validate it, and store/forward it somewhere useful.
// Everything else (Home, About, Services pages) is just static HTML
// files that Express hands out as-is -- that's the fastest, most
// SEO-friendly way to serve content that doesn't change per-request.
// ------------------------------------------------------------------

const express = require("express");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// express.json() lets us read JSON bodies sent by fetch() in main.js
app.use(express.json());

// Serve everything in /public directly: index.html, css/, js/, images/
// e.g. a request for /css/style.css automatically maps to
// public/css/style.css -- we don't have to write a route for every file.
app.use(express.static(path.join(__dirname, "public")));

// ------------------------------------------------------------------
// POST /api/contact
// The Contact page's <form> is submitted via JavaScript (fetch) to
// this endpoint instead of doing a full page reload. We:
//   1. Validate the fields on the server too (never trust the browser
//      alone -- a user can submit straight to this URL with curl).
//   2. Save the message to a local file (submissions.log) so nothing
//      is lost even before real email sending is wired up.
//   3. Return a JSON response the frontend can show a success/error
//      message from.
// ------------------------------------------------------------------
app.post("/api/contact", (req, res) => {
  const { name, email, phone, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({
      ok: false,
      error: "Name, email, and message are required.",
    });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return res.status(400).json({ ok: false, error: "Please enter a valid email address." });
  }

  const entry = {
    name,
    email,
    phone: phone || "",
    message,
    receivedAt: new Date().toISOString(),
  };

  // Append as a single JSON line. This keeps every submission even if
  // the server restarts. Later, this is the exact spot where you'd
  // instead call an email service (Nodemailer, Resend, SendGrid, etc.)
  // using credentials from your .env file -- see .env.example.
  fs.appendFile(
    path.join(__dirname, "submissions.log"),
    JSON.stringify(entry) + "\n",
    (err) => {
      if (err) {
        console.error("Failed to save submission:", err);
        return res.status(500).json({ ok: false, error: "Something went wrong. Please try WhatsApp instead." });
      }
      console.log("New contact form submission from:", name, email);
      return res.json({ ok: true, message: "Thanks! We'll get back to you soon." });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Zygote Digitals site running at http://localhost:${PORT}`);
});
