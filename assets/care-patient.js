(function () {
  const form = document.getElementById("carePatientForm");
  const message = document.getElementById("careSubmitMessage");
  const submitButton = document.getElementById("careSubmitButton");

  function formToSubmission(formElement) {
    const data = new FormData(formElement);
    return {
      clinicId: window.careApp.CARE_CLINIC_ID,
      name: String(data.get("name") || "").trim(),
      birthDate: data.get("birthDate") || "",
      phoneLast4: String(data.get("phoneLast4") || "").trim(),
      currentWeightKg: data.get("currentWeightKg") || "",
      startWeightKg: data.get("startWeightKg") || "",
      currentMedication: data.get("currentMedication") || "",
      currentDose: data.get("currentDose") || "",
      recentWeightChange: data.get("recentWeightChange") || "",
      appetite: data.get("appetite") || "",
      sideEffects: String(data.get("sideEffects") || "").trim(),
      constipation: data.get("constipation") || "",
      sleep: data.get("sleep") || "",
      exercise: data.get("exercise") || "",
      diet: String(data.get("diet") || "").trim(),
      consultationGoal: data.get("consultationGoal") || "",
      patientQuestion: String(data.get("patientQuestion") || "").trim(),
      severeAbdominalPain: data.get("severeAbdominalPain") === "on",
      persistentVomiting: data.get("persistentVomiting") === "on",
      dizzinessOrDehydration: data.get("dizzinessOrDehydration") === "on",
      pregnancyPossibility: data.get("pregnancyPossibility") === "on",
      consent: data.get("consent") === "on"
    };
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    message.textContent = "";
    submitButton.disabled = true;
    submitButton.textContent = "제출 중...";

    try {
      await window.careApp.careApi("/api/submit", {
        method: "POST",
        body: JSON.stringify(formToSubmission(form))
      });
      form.reset();
      message.textContent = "제출이 완료되었습니다. 진료 시 담당 의사가 입력 내용을 확인합니다.";
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      message.textContent = error.message;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "문진 제출";
    }
  });
})();
