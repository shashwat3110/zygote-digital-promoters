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
const nodemailer = require("nodemailer");
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
// Email transporter
// This uses Gmail's SMTP server to actually send an email the moment
// someone submits the contact form. EMAIL_USER/EMAIL_PASS come from
// environment variables (never hard-code real credentials in code) --
// see .env.example for local dev, and Render's Environment tab for
// the live site. EMAIL_PASS must be a Gmail "App Password", not your
// normal Gmail login password (Gmail blocks normal-password SMTP
// logins from apps like this one).
// ------------------------------------------------------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ------------------------------------------------------------------
// POST /api/contact
// The Contact page's <form> is submitted via JavaScript (fetch) to
// this endpoint instead of doing a full page reload. We:
//   1. Validate the fields on the server too (never trust the browser
//      alone -- a user can submit straight to this URL with curl).
//   2. Send a real email so the submission actually reaches someone,
//      instead of only living in a log file (Render's free tier wipes
//      local files on every restart/redeploy, so a file alone isn't
//      reliable).
//   3. Also append to submissions.log as a bonus backup for whenever
//      the server happens to still be running -- but email is now the
//      real delivery mechanism.
//   4. Return a JSON response the frontend can show a success/error
//      message from.
// ------------------------------------------------------------------
app.post("/api/contact", async (req, res) => {
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

  // Best-effort backup log -- don't let a file error block the email.
  fs.appendFile(
    path.join(__dirname, "submissions.log"),
    JSON.stringify(entry) + "\n",
    (err) => {
      if (err) console.error("Failed to write backup log:", err);
    }
  );

  try {
    await transporter.sendMail({
      from: `"Zygote Digitals Website" <${process.env.EMAIL_USER}>`,
      to: process.env.NOTIFY_EMAIL || process.env.EMAIL_USER,
      replyTo: email, // so hitting "Reply" goes straight to the visitor
      subject: `New enquiry from ${name} (via zygotedigitals.com)`,
      text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || "-"}\n\nMessage:\n${message}`,
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || "-"}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
      `,
    });

    console.log("Contact form email sent for:", name, email);
    return res.json({ ok: true, message: "Thanks! We'll get back to you soon." });
  } catch (err) {
    console.error("Failed to send contact form email:", err);
    return res.status(500).json({
      ok: false,
      error: "Something went wrong sending your message. Please try WhatsApp instead.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Zygote Digitals site running at http://localhost:${PORT}`);
});
