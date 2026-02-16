const crypto = require("crypto");

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function signPayload(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function makeToken(secret, maxAgeSec) {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSec;
  const payload = JSON.stringify({ role: "teacher", exp });
  const encoded = base64url(payload);
  const sig = signPayload(encoded, secret);
  return `${encoded}.${sig}`;
}

function safeEquals(a, b) {
  const ab = Buffer.from(a || "");
  const bb = Buffer.from(b || "");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const teacherPin = process.env.TEACHER_PIN || "8520";
  const authSecret = process.env.TEACHER_AUTH_SECRET || "insecure-dev-secret-change-me";

  const pin = (req.body && req.body.pin ? String(req.body.pin) : "").trim();
  const pinAlt = teacherPin.endsWith("$") ? teacherPin.slice(0, -1) : `${teacherPin}$`;
  if (!safeEquals(pin, teacherPin) && !safeEquals(pin, pinAlt)) {
    return res.status(401).json({ ok: false, error: "Invalid PIN" });
  }

  const maxAgeSec = 60 * 60;
  const token = makeToken(authSecret, maxAgeSec);
  const cookie = [
    `teacher_session=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAgeSec}`
  ].join("; ");
  res.setHeader("Set-Cookie", cookie);
  return res.status(200).json({ ok: true });
};
