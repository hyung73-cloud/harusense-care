import { careJson, careError } from "./_lib/care-utils.js";
import { careEnsureActiveClinic } from "./_lib/care-auth.js";
import {
  careGetTemplate,
  careResolveTemplateParams
} from "./_lib/care-templates.js";

export async function onRequestGet({ request, env }) {
  try {
    const db = env.CARE_DB;
    if (!db) {
      return careError("care DB가 설정되지 않았습니다.", 500);
    }

    const url = new URL(request.url);
    const clinicId = String(url.searchParams.get("clinic") || "newsense").trim();
    await careEnsureActiveClinic(db, clinicId);

    const resolved = careResolveTemplateParams({
      templateId: url.searchParams.get("template"),
      visitNumber: url.searchParams.get("visit")
    });

    const template = await careGetTemplate(db, clinicId, resolved.templateId);

    return careJson({
      ok: true,
      clinicId,
      templateId: template.id,
      visitNumber: resolved.visitNumber || template.visitNumber,
      title: template.title,
      description: template.description,
      sections: template.sections
    });
  } catch (error) {
    if (String(error.message) === "INVALID_CLINIC") {
      return careError("유효하지 않은 클리닉입니다.", 404);
    }
    return careError(error.message || "템플릿 조회 중 오류가 발생했습니다.", 400);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type"
    }
  });
}
