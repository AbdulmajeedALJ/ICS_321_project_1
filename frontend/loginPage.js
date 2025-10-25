const loginForm = document.getElementById("login-form");
const loginResponse = document.getElementById("login-response");

const USERS = {
  mjeed: {
    password: "mjeed123",
    redirect: "./guest.html",
    label: "Guest Portal",
  },
  abdulmajeed: {
    password: "mjeed123",
    redirect: "./admin.html",
    label: "Admin Console",
  },
  abdulellah: {
    password: "abd123",
    redirect: "./guest.html",
    label: "Guest Portal",
  },
  Abdulellah: {
    password: "abd123",
    redirect: "./admin.html",
    label: "Admin Console",
  },
  guest : {
    password: "guest123",
    redirect: "./guest.html",
    label: "Guest Portal",
  },
  admin : {
    password: "admin123",
    redirect: "./admin.html",
    label: "Admin Console",
  },
};

const setResponse = (state, message) => {
  if (!loginResponse) return;
  const stateClass =
    state === "success"
      ? "response__status--success"
      : "response__status--error";

  loginResponse.hidden = false;
  loginResponse.innerHTML = `<div class="response__status ${stateClass}">${message}</div>`;
};

const clearResponse = () => {
  if (!loginResponse) return;
  loginResponse.hidden = true;
  loginResponse.innerHTML = "";
};

if (loginForm) {
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(loginForm);
    const username = String(formData.get("username") || "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") || "");

    if (!username || !password) {
      setResponse("error", "Username and password are required.");
      return;
    }

    const userRecord = USERS[username];
    if (!userRecord || password !== userRecord.password) {
      setResponse("error", "Incorrect username or password.");
      return;
    }

    try {
      sessionStorage.setItem("userRole", username);
    } catch (error) {
      console.warn("Unable to persist user role in sessionStorage.", error);
    }

    setResponse(
      "success",
      `Welcome back! Redirecting to the ${userRecord.label.toLowerCase()}...`
    );

    setTimeout(() => {
      window.location.href = userRecord.redirect;
    }, 600);
  });

  loginForm.addEventListener("input", () => {
    clearResponse();
  });
}
