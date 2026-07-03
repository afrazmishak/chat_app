let sessionExpiredHandled = false;

export function handleSessionExpired() {
  if (sessionExpiredHandled) return;

  sessionExpiredHandled = true;

  alert("Session expired. Please login again.");

  localStorage.removeItem("chat_user");
  localStorage.removeItem("chat_token");

  window.location.reload();
}