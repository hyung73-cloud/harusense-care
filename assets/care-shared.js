(function () {
  const params = new URLSearchParams(window.location.search);
  const CARE_CLINIC_ID = params.get("clinic") || "newsense";
  const CARE_VISIT = params.get("visit");
  const CARE_TEMPLATE = params.get("template");

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

  function careVisitLabel(visitNumber, templateId) {
    if (templateId === "initial" || visitNumber === 1) return "초진";
    if (visitNumber) return `${visitNumber}회차`;
    return "재진";
  }

  window.careApp = {
    CARE_CLINIC_ID,
    CARE_VISIT,
    CARE_TEMPLATE,
    careApi,
    careEscapeHtml,
    careFormatTime,
    careVisitLabel
  };
})();
