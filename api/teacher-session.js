const crypto = require("crypto");

function parseCookies(header) {
  const out = {};
  (header || "").split(";").forEach((part) => {
    const i = part.indexOf("=");
    if (i === -1) return;
    const key = part.slice(0, i).trim();
    const val = part.slice(i + 1).trim();
    out[key] = decodeURIComponent(val);
  });
  return out;
}

function signPayload(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function verifyToken(token, secret) {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadEncoded, signature] = parts;
  const expected = signPayload(payloadEncoded, secret);
  const sb = Buffer.from(signature);
  const eb = Buffer.from(expected);
  if (sb.length !== eb.length || !crypto.timingSafeEqual(sb, eb)) return false;
  const payloadJson = Buffer.from(payloadEncoded, "base64url").toString("utf8");
  let payload;
  try {
    payload = JSON.parse(payloadJson);
  } catch {
    return false;
  }
  if (payload.role !== "teacher") return false;
  if (typeof payload.exp !== "number") return false;
  return payload.exp > Math.floor(Date.now() / 1000);
}

module.exports = async (req, res) => {
  const authSecret = process.env.TEACHER_AUTH_SECRET || "insecure-dev-secret-change-me";
  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies.teacher_session;
  if (!verifyToken(token, authSecret)) {
    return res.status(401).json({ ok: false });
  }
  return res.status(200).json({ ok: true });
};
