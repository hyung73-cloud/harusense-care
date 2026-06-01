(function () {
  const form = document.getElementById("carePatientForm");
  const message = document.getElementById("careSubmitMessage");
  const submitButton = document.getElementById("careSubmitButton");
  const title = document.getElementById("careFormTitle");
  const description = document.getElementById("careFormDescription");

  let activeTemplate = {
    templateId: "followup",
    visitNumber: 2,
    sections: ["patient", "medication", "symptoms", "safety", "consultation", "consent"]
  };

  function setSectionVisibility(sections) {
    form.querySelectorAll("[data-care-section]").forEach(function (panel) {
      const sectionName = panel.getAttribute("data-care-section");
      const visible = sections.includes(sectionName);
      panel.hidden = !visible;
      panel.querySelectorAll("input, select, textarea").forEach(function (field) {
        field.disabled = !visible;
        if (!visible) {
          field.removeAttribute("required");
        }
      });
    });
  }

  function applyRequiredFields(templateId) {
    if (templateId === "initial") {
      form.querySelector('[name="heightCm"]').setAttribute("required", "required");
      form.querySelector('[data-care-section="vitals"] [name="currentWeightKg"]').setAttribute("required", "required");
      return;
    }

    form.querySelector('[data-care-section="medication"] [name="currentWeightKg"]').setAttribute("required", "required");
    form.querySelector('[name="currentMedication"]').setAttribute("required", "required");
    form.querySelector('[name="recentWeightChange"]').setAttribute("required", "required");
    form.querySelector('[name="appetite"]').setAttribute("required", "required");
    form.querySelector('[name="constipation"]').setAttribute("required", "required");
    form.querySelector('[name="sleep"]').setAttribute("required", "required");
    form.querySelector('[name="exercise"]').setAttribute("required", "required");
    form.querySelector('[name="consultationGoal"]').setAttribute("required", "required");
  }

  async function loadTemplate() {
    const query = new URLSearchParams({
      clinic: window.careApp.CARE_CLINIC_ID
    });

    if (window.careApp.CARE_TEMPLATE) {
      query.set("template", window.careApp.CARE_TEMPLATE);
    }
    if (window.careApp.CARE_VISIT) {
      query.set("visit", window.careApp.CARE_VISIT);
    }

    const payload = await window.careApp.careApi(`/api/template?${query.toString()}`);
    activeTemplate = {
      templateId: payload.templateId,
      visitNumber: payload.visitNumber,
      sections: payload.sections || []
    };

    title.textContent = payload.title;
    description.textContent = payload.description;
    document.title = `${payload.title} | 뉴센스의원`;
    setSectionVisibility(activeTemplate.sections);
    applyRequiredFields(activeTemplate.templateId);
  }

  function formToSubmission(formElement) {
    const data = new FormData(formElement);
    const weightFromVitals = data.get("currentWeightKg");
    const weightFromMedication = form.querySelector('[data-care-section="medication"] [name="currentWeightKg"]');
    const currentWeightKg =
      activeTemplate.templateId === "initial"
        ? weightFromVitals
        : (weightFromMedication && !weightFromMedication.disabled ? weightFromMedication.value : weightFromVitals);

    return {
      clinicId: window.careApp.CARE_CLINIC_ID,
      templateId: activeTemplate.templateId,
      visitNumber: activeTemplate.visitNumber,
      name: String(data.get("name") || "").trim(),
      birthDate: data.get("birthDate") || "",
      phoneLast4: String(data.get("phoneLast4") || "").trim(),
      heightCm: data.get("heightCm") || "",
      currentWeightKg: currentWeightKg || "",
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

  loadTemplate().catch(function (error) {
    message.textContent = error.message;
  });
})();
