(function () {
  const form = document.getElementById("careLoginForm");
  const message = document.getElementById("careLoginMessage");

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    message.textContent = "";

    const data = new FormData(form);
    const loginId = String(data.get("loginId") || "").trim();
    const password = String(data.get("password") || "");

    try {
      await window.careApp.careApi("/api/login", {
        method: "POST",
        body: JSON.stringify({
          clinicId: window.careApp.CARE_CLINIC_ID,
          loginId,
          password
        })
      });
      window.location.href = "/dashboard/";
    } catch (error) {
      message.textContent = error.message;
    }
  });
})();
