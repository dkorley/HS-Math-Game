const reportBody = document.getElementById("report-body");
const exportBtn = document.getElementById("export-btn");
const clearBtn = document.getElementById("clear-btn");
const logoutBtn = document.getElementById("logout-btn");

async function ensureTeacherAuthorized() {
  const localAuth = localStorage.getItem("escape_teacher_auth_local");
  const localAuthTime = Number(localStorage.getItem("escape_teacher_auth_local_time") || "0");
  const localAge = Date.now() - localAuthTime;
  if (localAuth === "1" && localAge >= 0 && localAge < 1000 * 60 * 60) {
    return true;
  }

  try {
    const res = await fetch("/api/teacher-session", { method: "GET" });
    if (res.status === 404) {
      window.location.href = "dashboard.html";
      return false;
    }
    if (!res.ok) {
      window.location.href = "dashboard.html";
      return false;
    }
    return true;
  } catch {
    window.location.href = "dashboard.html";
    return false;
  }
}

function readReports() {
  try {
    return JSON.parse(localStorage.getItem("escape_teacher_reports") || "[]");
  } catch {
    return [];
  }
}

function renderTable() {
  const rows = readReports().slice().reverse();
  reportBody.innerHTML = "";
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.date || ""}</td>
      <td>${r.student || ""}</td>
      <td>${r.course || ""}</td>
      <td>${r.level || ""}</td>
      <td>${r.time || ""}</td>
      <td>${r.score_gain ?? ""}</td>
      <td>${r.attempts ?? ""}</td>
      <td>${r.accuracy ?? ""}%</td>
      <td>${r.reward || ""}</td>
      <td>${r.treasure || ""}</td>
    `;
    reportBody.appendChild(tr);
  });
}

function exportCsv() {
  const rows = readReports();
  const header = ["date", "student", "course", "level", "time", "score_gain", "attempts", "accuracy", "reward", "treasure"];
  const lines = [header.join(",")];
  rows.forEach((r) => {
    const line = header
      .map((k) => `"${String(r[k] ?? "").replaceAll('"', '""')}"`)
      .join(",");
    lines.push(line);
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "escape_room_teacher_report.csv";
  a.click();
  URL.revokeObjectURL(url);
}

exportBtn.addEventListener("click", exportCsv);
clearBtn.addEventListener("click", () => {
  localStorage.removeItem("escape_teacher_reports");
  renderTable();
});

logoutBtn.addEventListener("click", async () => {
  localStorage.removeItem("escape_teacher_auth_local");
  localStorage.removeItem("escape_teacher_auth_local_time");
  try {
    await fetch("/api/teacher-logout", { method: "POST" });
  } catch {}
  window.location.href = "dashboard.html";
});

(async () => {
  const ok = await ensureTeacherAuthorized();
  if (!ok) return;
  renderTable();
})();
