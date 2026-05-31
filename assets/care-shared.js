(function () {
  const params = new URLSearchParams(window.location.search);
  const CARE_CLINIC_ID = params.get("clinic") || "newsense";

  async function careApi(path, options = {}) {
    const response = await fetch(path, {
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        ...(options.headers || {})
      },
      ...options
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || "요청 처리 중 오류가 발생했습니다.");
    }
    return payload;
  }

  function careEscapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function careFormatTime(value) {
    return new Date(value).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  window.careApp = {
    CARE_CLINIC_ID,
    careApi,
    careEscapeHtml,
    careFormatTime
  };
})();
