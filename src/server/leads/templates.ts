// src/server/leads/templates.ts
//
// Follow-up template rendering — {{name}}, {{institute}}, {{email}}.
export interface LeadVars {
  name: string;
  email?: string | null;
  institute?: string | null;
}

export function renderTemplate(text: string, vars: LeadVars): string {
  return text
    .replace(/\{\{\s*name\s*\}\}/g, vars.name)
    .replace(/\{\{\s*institute\s*\}\}/g, vars.institute ?? "your institute")
    .replace(/\{\{\s*email\s*\}\}/g, vars.email ?? "");
}
