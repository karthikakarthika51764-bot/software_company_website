const jobs = {
  "frontend-developer": "Frontend Developer",
  "ui-ux-designer": "UI/UX Designer",
  "software-engineer": "Software Engineer"
};

const storageKeys = {
  accounts: "exon-careers-demo-accounts",
  applications: "exon-careers-demo-applications",
  session: "exon-careers-demo-session"
};

const authPanel = document.getElementById("authPanel");
const dashboard = document.getElementById("candidateDashboard");
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authStatus = document.getElementById("authStatus");
const dashboardStatus = document.getElementById("dashboardStatus");
const applicationDialog = document.getElementById("applicationDialog");
const applicationForm = document.getElementById("applicationForm");
const applicationStatus = document.getElementById("applicationStatus");

let accounts = [];
let applications = [];
let currentAccount = null;
let pendingJob = null;
let storageReady = false;

function readStoredValue(key, fallback) {
  const value = localStorage.getItem(key);
  return value === null ? fallback : JSON.parse(value);
}

function writeStoredValue(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function setStatus(element, message, success = false) {
  element.textContent = message;
  element.classList.toggle("success", success);
}

function setAuthMode(mode) {
  const isLogin = mode === "login";
  loginForm.hidden = !isLogin;
  registerForm.hidden = isLogin;
  loginTab.classList.toggle("active", isLogin);
  registerTab.classList.toggle("active", !isLogin);
  loginTab.setAttribute("aria-selected", String(isLogin));
  registerTab.setAttribute("aria-selected", String(!isLogin));
  setStatus(authStatus, "");
}

function toHex(bytes) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password, salt) {
  if (!window.crypto?.subtle || !window.crypto?.getRandomValues) {
    throw new Error("This browser does not support the secure password hashing required by this demo.");
  }

  const passwordBytes = new TextEncoder().encode(password);
  const key = await window.crypto.subtle.importKey("raw", passwordBytes, "PBKDF2", false, ["deriveBits"]);
  const bits = await window.crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" },
    key,
    256
  );
  return toHex(bits);
}

function base64FromBytes(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function bytesFromBase64(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function passwordsMatch(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function renderApplications() {
  const list = document.getElementById("applicationList");
  const empty = document.getElementById("applicationEmpty");
  const myApplications = applications.filter((application) => application.email === currentAccount.email);
  list.replaceChildren();
  empty.hidden = myApplications.length > 0;

  myApplications.forEach((application) => {
    const item = document.createElement("li");
    item.append(document.createTextNode(application.role));
    const date = document.createElement("span");
    date.textContent = `Submitted ${new Date(application.submittedAt).toLocaleDateString()}`;
    item.append(date);
    list.append(item);
  });
}

function renderAccount() {
  const isLoggedIn = Boolean(currentAccount);
  authPanel.hidden = isLoggedIn;
  dashboard.hidden = !isLoggedIn;

  if (!isLoggedIn) return;

  document.getElementById("candidateWelcome").textContent = `Hello, ${currentAccount.name}`;
  renderApplications();
}

function openApplication(jobId) {
  if (!storageReady || !jobs[jobId]) return;
  if (!currentAccount) {
    pendingJob = jobId;
    setAuthMode("register");
    setStatus(authStatus, "Create an account or log in to apply.");
    document.getElementById("candidate-account").scrollIntoView({ behavior: "smooth" });
    document.getElementById("registerName").focus({ preventScroll: true });
    return;
  }

  const alreadyApplied = applications.some(
    (application) => application.email === currentAccount.email && application.role === jobs[jobId]
  );
  if (alreadyApplied) {
    setStatus(dashboardStatus, `You have already applied for ${jobs[jobId]}.`);
    document.getElementById("candidate-account").scrollIntoView({ behavior: "smooth" });
    return;
  }

  pendingJob = null;
  document.getElementById("applicationRole").textContent = jobs[jobId];
  document.getElementById("applicationName").value = currentAccount.name;
  document.getElementById("applicationEmail").value = currentAccount.email;
  document.getElementById("applicationMessage").value = "";
  setStatus(applicationStatus, "");
  applicationDialog.showModal();
}

function finishAuthentication(account) {
  writeStoredValue(storageKeys.session, account.email);
  currentAccount = account;
  renderAccount();
  setStatus(dashboardStatus, "You are signed in to the browser demo.", true);
  const nextJob = pendingJob;
  pendingJob = null;
  if (nextJob) openApplication(nextJob);
}

function initializeStorage() {
  try {
    accounts = readStoredValue(storageKeys.accounts, []);
    applications = readStoredValue(storageKeys.applications, []);
    if (!Array.isArray(accounts) || !Array.isArray(applications)) {
      throw new Error("Saved careers demo data has an invalid format.");
    }

    const sessionEmail = readStoredValue(storageKeys.session, null);
    currentAccount = accounts.find((account) => account.email === sessionEmail) || null;
    storageReady = true;
    renderAccount();
  } catch (error) {
    setStatus(authStatus, `Could not load browser demo data: ${error.message}`);
    loginForm.querySelectorAll("input, button").forEach((element) => {
      element.disabled = true;
    });
    registerForm.querySelectorAll("input, button").forEach((element) => {
      element.disabled = true;
    });
  }
}

loginTab.addEventListener("click", () => setAuthMode("login"));
registerTab.addEventListener("click", () => setAuthMode("register"));

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!storageReady) return;

  const email = loginForm.elements.email.value.trim().toLowerCase();
  const password = loginForm.elements.password.value;
  if (!loginForm.elements.email.validity.valid || password.length === 0) {
    setStatus(authStatus, "Enter a valid email address and password.");
    return;
  }
  const account = accounts.find((candidate) => candidate.email === email);

  try {
    if (!account) throw new Error("Email or password is incorrect.");
    const passwordHash = await hashPassword(password, bytesFromBase64(account.salt));
    if (!passwordsMatch(passwordHash, account.passwordHash)) {
      throw new Error("Email or password is incorrect.");
    }
    loginForm.reset();
    finishAuthentication(account);
  } catch (error) {
    setStatus(authStatus, error.message);
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!storageReady) return;

  const name = registerForm.elements.name.value.trim();
  const email = registerForm.elements.email.value.trim().toLowerCase();
  const password = registerForm.elements.password.value;

  if (name.length < 2) {
    setStatus(authStatus, "Please enter your full name.");
    return;
  }
  if (!registerForm.elements.email.validity.valid) {
    setStatus(authStatus, "Enter a valid email address.");
    return;
  }
  if (password.length < 8) {
    setStatus(authStatus, "Use a password with at least 8 characters.");
    return;
  }
  if (accounts.some((account) => account.email === email)) {
    setAuthMode("login");
    loginForm.elements.email.value = email;
    setStatus(authStatus, "An account with this email already exists. Please log in.");
    return;
  }

  try {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const account = {
      name,
      email,
      salt: base64FromBytes(salt),
      passwordHash: await hashPassword(password, salt)
    };
    const updatedAccounts = [...accounts, account];
    writeStoredValue(storageKeys.accounts, updatedAccounts);
    accounts = updatedAccounts;
    registerForm.reset();
    finishAuthentication(account);
  } catch (error) {
    setStatus(authStatus, `Could not create the demo account: ${error.message}`);
  }
});

document.querySelectorAll("[data-apply]").forEach((button) => {
  button.addEventListener("click", () => openApplication(button.dataset.apply));
});

applicationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!currentAccount || !storageReady) {
    applicationDialog.close();
    setStatus(authStatus, "Please log in again before submitting an application.");
    renderAccount();
    return;
  }

  const role = document.getElementById("applicationRole").textContent;
  const name = document.getElementById("applicationName").value.trim();
  const email = document.getElementById("applicationEmail").value.trim().toLowerCase();
  const message = document.getElementById("applicationMessage").value.trim();
  if (name.length < 2 || email !== currentAccount.email || message.length < 10) {
    setStatus(applicationStatus, "Enter your name and a valid introduction of at least 10 characters.");
    return;
  }

  const alreadyApplied = applications.some(
    (application) => application.email === currentAccount.email && application.role === role
  );
  if (alreadyApplied) {
    setStatus(applicationStatus, "You have already applied for this role.");
    return;
  }

  try {
    const updatedApplications = [...applications, {
      name,
      email,
      role,
      message,
      submittedAt: new Date().toISOString()
    }];
    writeStoredValue(storageKeys.applications, updatedApplications);
    applications = updatedApplications;
    applicationDialog.close();
    renderApplications();
    setStatus(dashboardStatus, `Your demo application for ${role} has been saved in this browser.`, true);
  } catch (error) {
    setStatus(applicationStatus, `Could not save your demo application: ${error.message}`);
  }
});

document.getElementById("closeApplication").addEventListener("click", () => applicationDialog.close());

applicationDialog.addEventListener("click", (event) => {
  if (event.target === applicationDialog) applicationDialog.close();
});

document.getElementById("logoutButton").addEventListener("click", () => {
  try {
    localStorage.removeItem(storageKeys.session);
    currentAccount = null;
    renderAccount();
    setStatus(authStatus, "You have logged out.", true);
  } catch (error) {
    setStatus(dashboardStatus, `Could not log out: ${error.message}`);
  }
});

initializeStorage();
