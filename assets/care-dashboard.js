(function () {
  const list = document.getElementById("careSubmissionList");
  const detail = document.getElementById("careSubmissionDetail");
  const count = document.getElementById("careTodayCount");
  const logout = document.getElementById("careLogoutButton");

  let submissions = [];
  let selectedId = null;

  function renderTags(tags) {
    return (tags || []).map((tag) => {
      const className = tag === "안전확인" ? "care-tag care-tag-warning" : "care-tag";
      return `<span class="${className}">${window.careApp.careEscapeHtml(tag)}</span>`;
    }).join("");
  }

  function renderList(items) {
    submissions = items;
    count.textContent = `${items.length}명`;

    if (!items.length) {
      list.innerHTML = '<p class="care-empty">오늘 제출된 문진이 없습니다.</p>';
      detail.innerHTML = '<div class="care-empty">오늘 제출된 문진이 없습니다.</div>';
      return;
    }

    list.innerHTML = items.map((submission) => `
      <button class="care-submission-item" type="button" data-id="${submission.id}" aria-selected="${submission.id === selectedId ? "true" : "false"}">
        <strong>${window.careApp.careEscapeHtml(submission.name)} · ${window.careApp.careFormatTime(submission.submittedAt)}</strong>
        <span>${window.careApp.careEscapeHtml(submission.currentMedication)} ${window.careApp.careEscapeHtml(submission.currentDose)} · 현재 ${window.careApp.careEscapeHtml(submission.currentWeightKg)}kg</span>
        <div class="care-tags">${renderTags(submission.tags)}</div>
        <span class="care-small">요약: ${window.careApp.careEscapeHtml(submission.summaryStatus || "pending")}</span>
      </button>
    `).join("");

    list.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", function () {
        selectedId = button.dataset.id;
        list.querySelectorAll("button").forEach((item) => {
          item.setAttribute("aria-selected", item.dataset.id === selectedId ? "true" : "false");
        });
        loadDetail(selectedId);
      });
    });

    if (!selectedId || !items.find((item) => item.id === selectedId)) {
      selectedId = items[0].id;
    }

    loadDetail(selectedId);
  }

  async function loadDetail(submissionId) {
    detail.innerHTML = '<div class="care-empty">불러오는 중...</div>';

    try {
      const payload = await window.careApp.careApi(`/api/submission?id=${encodeURIComponent(submissionId)}`);
      renderDetail(payload.submission, payload.summary, payload.history || []);
    } catch (error) {
      detail.innerHTML = `<div class="care-empty">${window.careApp.careEscapeHtml(error.message)}</div>`;
    }
  }

  function renderDetail(submission, summary, history) {
    const summaryStatus = summary ? summary.summaryStatus : "pending";
    const canRetry = summaryStatus === "failed" || summaryStatus === "pending";

    detail.innerHTML = `
      <article class="care-detail">
        <div>
          <p class="care-eyebrow">${window.careApp.careEscapeHtml(window.careApp.careFormatTime(submission.submittedAt))} 제출</p>
          <h2>${window.careApp.careEscapeHtml(submission.name)} 환자</h2>
        </div>

        <section class="care-kv">
          <div><span>생년월일</span>${window.careApp.careEscapeHtml(submission.birthDate || "미입력")}</div>
          <div><span>연락처 뒷자리</span>${window.careApp.careEscapeHtml(submission.phoneLast4 || "미입력")}</div>
          <div><span>현재/시작 체중</span>${window.careApp.careEscapeHtml(submission.currentWeightKg || "__")}kg / ${window.careApp.careEscapeHtml(submission.startWeightKg || "__")}kg</div>
          <div><span>약제/용량</span>${window.careApp.careEscapeHtml(submission.currentMedication || "__")} ${window.careApp.careEscapeHtml(submission.currentDose || "")}</div>
        </section>

        <section class="care-detail-section">
          <h2>AI 참고 요약</h2>
          <p>${window.careApp.careEscapeHtml(summary && summary.patientStatusSummary ? summary.patientStatusSummary : "요약 생성 중이거나 실패했습니다.")}</p>
          <p class="care-small">${window.careApp.careEscapeHtml(summary ? summary.disclaimer : "본 요약은 의사 상담 참고용입니다.")}</p>
          ${summary && summary.errorMessage ? `<p class="care-small">오류: ${window.careApp.careEscapeHtml(summary.errorMessage)}</p>` : ""}
          ${canRetry ? `<button id="careRetrySummaryButton" class="care-secondary" type="button">AI 요약 다시 생성</button>` : ""}
        </section>

        <section class="care-detail-section">
          <h2>변화 포인트</h2>
          <ul>${(summary ? summary.changePoints : []).map((item) => `<li>${window.careApp.careEscapeHtml(item)}</li>`).join("") || "<li>없음</li>"}</ul>
        </section>

        <section class="care-detail-section">
          <h2>의사 확인 필요사항</h2>
          <ul>${(summary ? summary.doctorCheckItems : []).map((item) => `<li>${window.careApp.careEscapeHtml(item)}</li>`).join("") || "<li>없음</li>"}</ul>
        </section>

        <section class="care-detail-section">
          <h2>의사 검토 후보</h2>
          <ul>${(summary ? summary.optionCandidates : []).map((item) => `<li>${window.careApp.careEscapeHtml(item)}</li>`).join("") || "<li>없음</li>"}</ul>
        </section>

        <section class="care-detail-section">
          <h2>최근 제출 기록</h2>
          <ul>${history.map((item) => `<li>${window.careApp.careEscapeHtml(item.submittedDate)} · ${window.careApp.careEscapeHtml(item.currentWeightKg || "__")}kg · ${window.careApp.careEscapeHtml(item.currentMedication || "")}</li>`).join("") || "<li>없음</li>"}</ul>
        </section>

        <section class="care-detail-section">
          <h2>차트 복사용 문장</h2>
          <div class="care-copy-box" id="careCopyText">${window.careApp.careEscapeHtml(summary ? summary.chartCopyText : "")}</div>
          <button id="careCopyButton" class="care-primary" type="button">복사</button>
        </section>
      </article>
    `;

    const copyButton = document.getElementById("careCopyButton");
    if (copyButton) {
      copyButton.addEventListener("click", async function () {
        const text = document.getElementById("careCopyText").textContent;
        await navigator.clipboard.writeText(text);
        try {
          await window.careApp.careApi("/api/audit", {
            method: "POST",
            body: JSON.stringify({
              action: "copy_chart_text",
              targetType: "careSubmission",
              targetId: submission.id
            })
          });
        } catch (_error) {
          // 복사는 성공했으면 감사 로그 실패는 무시
        }
        copyButton.textContent = "복사됨";
        setTimeout(() => {
          copyButton.textContent = "복사";
        }, 1500);
      });
    }

    const retryButton = document.getElementById("careRetrySummaryButton");
    if (retryButton) {
      retryButton.addEventListener("click", async function () {
        retryButton.disabled = true;
        retryButton.textContent = "생성 중...";
        try {
          await window.careApp.careApi("/api/summarize", {
            method: "POST",
            body: JSON.stringify({ submissionId: submission.id })
          });
          await loadDashboard(false);
          await loadDetail(submission.id);
        } catch (error) {
          retryButton.textContent = error.message;
        }
      });
    }
  }

  async function loadDashboard(selectFirst = true) {
    if (selectFirst) {
      selectedId = null;
    }

    const payload = await window.careApp.careApi("/api/dashboard");
    renderList(payload.submissions || []);
  }

  logout.addEventListener("click", async function () {
    try {
      await window.careApp.careApi("/api/logout", { method: "POST", body: "{}" });
    } catch (_error) {
      // ignore
    }
    window.location.href = "/login/";
  });

  loadDashboard().catch(function (error) {
    if (String(error.message).includes("로그인")) {
      window.location.href = "/login/";
      return;
    }
    detail.innerHTML = `<div class="care-empty">${window.careApp.careEscapeHtml(error.message)}</div>`;
  });
})();
