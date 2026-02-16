const roleSelector = document.getElementById("role-selector");
const studentPanel = document.getElementById("student-panel");
const teacherPanel = document.getElementById("teacher-panel");
const studentRoleBtn = document.getElementById("student-role-btn");
const teacherRoleBtn = document.getElementById("teacher-role-btn");
const backRoleBtn = document.getElementById("back-role-btn");
const backRoleBtn2 = document.getElementById("back-role-btn-2");

const nameInput = document.getElementById("full-name-input");
const courseSelect = document.getElementById("course-select");
const loginBtn = document.getElementById("login-btn");
const teacherBtn = document.getElementById("teacher-btn");
const errorEl = document.getElementById("dashboard-error");
const teacherPinInput = document.getElementById("teacher-pin-input");
const teacherPinError = document.getElementById("teacher-pin-error");
const LOCAL_TEACHER_PINS = new Set(["8520", "8520$"]);

function normalizeName(raw) {
  return raw.replace(/\s+/g, " ").trim();
}

function isValidFullName(name) {
  return name.length >= 3 && name.includes(" ");
}

function showSelector() {
  roleSelector.style.display = "block";
  studentPanel.style.display = "none";
  teacherPanel.style.display = "none";
}

function showStudentPanel() {
  roleSelector.style.display = "none";
  studentPanel.style.display = "block";
  teacherPanel.style.display = "none";
}

function showTeacherPanel() {
  roleSelector.style.display = "none";
  studentPanel.style.display = "none";
  teacherPanel.style.display = "block";
}

studentRoleBtn.addEventListener("click", showStudentPanel);
teacherRoleBtn.addEventListener("click", showTeacherPanel);
backRoleBtn.addEventListener("click", showSelector);
backRoleBtn2.addEventListener("click", showSelector);

loginBtn.addEventListener("click", () => {
  const fullName = normalizeName(nameInput.value);
  if (!isValidFullName(fullName)) {
    errorEl.textContent = "Please enter your full name (first and last).";
    return;
  }
  localStorage.setItem("escape_student_name", fullName);
  localStorage.setItem("escape_course", courseSelect.value);
  // New session seed on every login guarantees a fresh personalized set.
  localStorage.setItem("escape_session_seed", `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`);
  window.location.href = "index.html";
});

teacherBtn.addEventListener("click", async () => {
  const pin = (teacherPinInput.value || "").trim();
  if (!pin) {
    teacherPinError.textContent = "Enter teacher PIN.";
    return;
  }
  const isLocalHost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "::1";

  if (isLocalHost) {
    if (!LOCAL_TEACHER_PINS.has(pin)) {
      teacherPinError.textContent = "Invalid PIN.";
      return;
    }
    localStorage.setItem("escape_teacher_auth_local", "1");
    localStorage.setItem("escape_teacher_auth_local_time", String(Date.now()));
    teacherPinError.textContent = "";
    window.location.href = "teacher.html";
    return;
  }

  try {
    const res = await fetch("/api/teacher-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin })
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 404) {
      if (!LOCAL_TEACHER_PINS.has(pin)) {
        teacherPinError.textContent = "Invalid PIN.";
        return;
      }
      localStorage.setItem("escape_teacher_auth_local", "1");
      localStorage.setItem("escape_teacher_auth_local_time", String(Date.now()));
      teacherPinError.textContent = "";
      window.location.href = "teacher.html";
      return;
    }
    if (!res.ok || !data.ok) {
      teacherPinError.textContent = data.error || "Invalid PIN.";
      return;
    }
    teacherPinError.textContent = "";
    window.location.href = "teacher.html";
  } catch {
    if (!LOCAL_TEACHER_PINS.has(pin)) {
      teacherPinError.textContent = "Invalid PIN.";
      return;
    }
    localStorage.setItem("escape_teacher_auth_local", "1");
    localStorage.setItem("escape_teacher_auth_local_time", String(Date.now()));
    teacherPinError.textContent = "";
    window.location.href = "teacher.html";
  }
});

showSelector();
