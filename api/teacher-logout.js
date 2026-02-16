module.exports = async (_req, res) => {
  const cookie = [
    "teacher_session=",
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0"
  ].join("; ");
  res.setHeader("Set-Cookie", cookie);
  return res.status(200).json({ ok: true });
};
