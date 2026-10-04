# Bulk CSV issuance draft — admin dashboard (`certivo-demo-redesigned.html`)

Status: DRAFT, not applied. User approval needed.

## Why this one next

- REDESIGN-REPORT.md §3 lists **bulk issuance as the #1 issuer-side gap** ("biggest issuer-side gap") — none of the 10 roadmap items exist in the demo or the Next.js app yet.
- The pending pricing draft (`pricing-section-draft.md` §5) honestly flags that its "Bulk CSV issuance" Growth-tier bullet is aspirational. Adding this flow makes that claim true inside the demo.
- Institutes issue certificates in batches (a whole course cohort), never one-by-one — this is the screen that makes an institute admin say "yeh toh hamare kaam ka hai."

## 1) Buttons to add

**Dashboard** — next to Export CSV, ~line 2596:
```html
<button class="btn btn-outline" type="button" onclick="nav('/admin/students/bulk')">${ic("users")} Bulk issue (CSV)</button>
```

**Students page** — next to "Register a student", ~line 2677:
```html
<button class="btn btn-outline" onclick="nav('/admin/students/bulk')">Bulk issue (CSV)</button>
```

## 2) Route (before the `/admin/students/` catch-all, ~line 3459)

```js
else if (path === "/admin/students/bulk") { if (requireAdmin()) html = screenAdminStudentBulk(); else return; }
```

**State reset** — extend the reset at ~line 3434 so the bulk preview clears on navigation:
```js
if (!path.startsWith("/admin/students/") || path === "/admin/students/new" || path === "/admin/students/bulk") {
```

## 3) Functions (paste after `exportStudentsCSV()`, ~line 1792)

All validators and generators below already exist in the demo: `generateUniqueStudentCode()`,
`randomCode()`, `CERT_PREFIX`, `parseOptionalRupeesToPaise()`, `validateNotFutureDate()`,
`isValidEmail()`, `isValidIndianMobile()`, `todayIso()`, `toast()`, `adminChrome()`, `render()`.

```js
/* ===== Bulk CSV issuance (DRAFT) ===== */
let bulkRows = [];   // parsed + validated rows awaiting issue
let bulkResult = null; // { issued:[{code,tempPassword,fullName,courseName,certCode}] } after issuing

const BULK_COLUMNS = ["Full name","Course","Email","Phone","Date of birth","Gender","Guardian name",
  "Address line 1","City","State","Pincode","Completion date","Registration fee (INR)","Certificate fee (INR)"];

function bulkCsvCell(v) { return `"${String(v == null ? "" : v).replace(/"/g, '""')}"`; }

/* Step 1: template with one example row, same CSV conventions as exportStudentsCSV() */
function downloadBulkTemplate() {
  const example = ["Aarav Patel","Full Stack Web Development","aarav@example.com","9876543210","2002-05-14",
    "Male","Suresh Patel","44 MG Road","Pune","Maharashtra","411001","2026-09-30","5000","1000"];
  const csv = "\ufeff" + BULK_COLUMNS.map(bulkCsvCell).join(",") + "\n" + example.map(bulkCsvCell).join(",");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = "certivo-bulk-template.csv";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast("Template downloaded — fill it in and upload it below", "success");
}

/* Minimal CSV parser: quoted cells, embedded commas/quotes, BOM-tolerant */
function parseCsvText(text) {
  const rows = []; let row = [], cell = "", inQ = false;
  const t = String(text).replace(/^\ufeff/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQ) {
      if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else inQ = false; }
      else cell += c;
    }
    else if (c === '"') inQ = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    }
    else cell += c;
  }
  row.push(cell); rows.push(row);
  return rows.filter((r) => r.length > 1 || r[0].trim() !== "");
}

/* Step 2: parse + validate every row with the same rules as the single-register form */
function onBulkFileSelected(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const grid = parseCsvText(reader.result || "");
      if (grid.length < 2) { toast("That file looks empty — download the template first", "error"); return; }
      const header = grid[0].map((h) => h.trim());
      const missing = BULK_COLUMNS.filter((c) => !header.includes(c));
      if (missing.length) { toast("Missing columns: " + missing.join(", "), "error"); return; }
      const idx = {}; BULK_COLUMNS.forEach((c) => { idx[c] = header.indexOf(c); });
      bulkRows = grid.slice(1).map((cells) => {
        const d = {}; BULK_COLUMNS.forEach((c) => { d[c] = (cells[idx[c]] || "").trim(); });
        const errors = [];
        if (!d["Full name"]) errors.push("Full name required");
        if (!d["Course"]) errors.push("Course required");
        if (d["Email"] && !isValidEmail(d["Email"])) errors.push("Invalid email");
        if (d["Phone"] && !isValidIndianMobile(d["Phone"])) errors.push("Phone must be a 10-digit Indian mobile");
        const dob = validateNotFutureDate(d["Date of birth"], "Date of birth"); if (dob.error) errors.push(dob.error);
        const comp = validateNotFutureDate(d["Completion date"], "Completion date"); if (comp.error) errors.push(comp.error);
        const rf = parseOptionalRupeesToPaise(d["Registration fee (INR)"], "Registration fee"); if (rf.error) errors.push(rf.error);
        const cf = parseOptionalRupeesToPaise(d["Certificate fee (INR)"], "Certificate fee"); if (cf.error) errors.push(cf.error);
        return { data: d, errors, ok: errors.length === 0, regFeePaise: rf.paise, certFeePaise: cf.paise };
      });
      bulkResult = null;
      render();
      const ok = bulkRows.filter((r) => r.ok).length;
      toast(`${ok} of ${bulkRows.length} rows ready` + (ok < bulkRows.length ? " — fix the rest or issue the valid ones" : ""), ok ? "success" : "error");
    } catch (err) { toast("Couldn't read that file — is it a valid CSV?", "error"); }
  };
  reader.readAsText(file);
  input.value = "";
}

/* Step 3: issue every valid row — same record shape as onRegisterStudent() */
function onBulkIssue() {
  const good = bulkRows.filter((r) => r.ok);
  if (!good.length) return;
  const issued = [];
  for (const r of good) {
    const d = r.data;
    const code = generateUniqueStudentCode();
    const tempPassword = randomCode(10);
    const certCode = `${CERT_PREFIX}-${new Date().getFullYear()}-${randomCode(10)}`;
    db.students.push({
      id: "s" + (db.nextSeq++), instituteId: session.instituteId,
      code, password: tempPassword,
      fullName: d["Full name"], email: d["Email"] || null, phone: d["Phone"] || null,
      dateOfBirth: d["Date of birth"] || null, gender: d["Gender"] || null,
      guardianName: d["Guardian name"] || null,
      addressLine1: d["Address line 1"] || null, city: d["City"] || null,
      state: d["State"] || null, pincode: d["Pincode"] || null,
      courseName: d["Course"], completionDate: d["Completion date"] || todayIso(),
      registrationFeePaise: r.regFeePaise, registrationFeePaid: false,
      certificateCode: certCode, certificateStatus: "ACTIVE",
      certificateRevokedReason: null, certificateRevokedAt: null,
      certificateFeePaise: r.certFeePaise, certificateFeePaid: false,
      certificateDownloadCount: 0,
    });
    issued.push({ code, tempPassword, fullName: d["Full name"], courseName: d["Course"], certCode });
  }
  bulkResult = { issued };
  bulkRows = [];
  render();
  toast(`Issued ${issued.length} certificate${issued.length === 1 ? "" : "s"}`, "success");
}

/* Results: credentials CSV for the institute to distribute privately to students */
function downloadBulkCredentials() {
  if (!bulkResult) return;
  const head = ["Student code (login)", "Temporary password", "Full name", "Course", "Certificate code"];
  const csv = "\ufeff" + [head, ...bulkResult.issued.map((x) => [x.code, x.tempPassword, x.fullName, x.courseName, x.certCode])]
    .map((r) => r.map(bulkCsvCell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = "certivo-issued-credentials.csv";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast("Credentials downloaded — share each row privately with the student", "success");
}

function screenAdminStudentBulk() {
  if (bulkResult) {
    const n = bulkResult.issued.length;
    return adminChrome("students", `
      <h1 style="font-size:22px;margin-bottom:20px;">Bulk issuance complete</h1>
      <div class="card card-pad">
        <div style="color:var(--success);font-weight:600;font-size:16px;">${n} certificate${n === 1 ? "" : "s"} issued</div>
        <p style="color:var(--text-muted);font-size:13px;margin-top:4px;">Download the credentials file and share each row privately with the student — passwords are shown only here.</p>
        <div style="overflow-x:auto;margin-top:16px;">
          <table class="tbl"><thead><tr><th>Student ID</th><th>Temp password</th><th>Name</th><th>Certificate code</th></tr></thead>
          <tbody>${bulkResult.issued.map((x) => `<tr><td class="mono">${x.code}</td><td class="mono">${x.tempPassword}</td><td>${x.fullName}</td><td class="mono">${x.certCode}</td></tr>`).join("")}</tbody></table>
        </div>
        <div style="display:flex;gap:10px;margin-top:22px;flex-wrap:wrap;">
          <button class="btn btn-primary" type="button" onclick="downloadBulkCredentials()">${ic("download")} Download credentials CSV</button>
          <button class="btn btn-outline" type="button" onclick="bulkResult=null;nav('/admin/students/bulk')">Issue more</button>
          <button class="btn btn-outline" type="button" onclick="nav('/admin/students')">Back to students</button>
        </div>
      </div>`);
  }
  const rows = bulkRows;
  const okCount = rows.filter((r) => r.ok).length;
  const badCount = rows.length - okCount;
  const previewRows = rows.slice(0, 50).map((r, i) => `
    <tr>
      <td style="color:var(--text-faint);">${i + 1}</td>
      <td>${r.data["Full name"] || "<span style='color:var(--text-faint);'>—</span>"}</td>
      <td>${r.data["Course"] || "<span style='color:var(--text-faint);'>—</span>"}</td>
      <td>${r.ok
        ? '<span class="badge badge-success">Ready</span>'
        : `<span class="badge badge-danger" title="${r.errors.join("; ")}">Fix needed</span>`}</td>
    </tr>`).join("");
  return adminChrome("students", `
    <h1 style="font-size:22px;margin-bottom:20px;">Bulk issue certificates</h1>
    <div style="display:flex;flex-direction:column;gap:20px;">
      <div class="card card-pad">
        <h3 style="font-size:14.5px;margin-bottom:6px;">1 · Download the template</h3>
        <p style="color:var(--text-muted);font-size:13px;margin-bottom:14px;">One row per student. Full name and Course are required; everything else is optional — same rules as the single-register form.</p>
        <button class="btn btn-outline" type="button" onclick="downloadBulkTemplate()">${ic("download")} Download CSV template</button>
      </div>
      <div class="card card-pad">
        <h3 style="font-size:14.5px;margin-bottom:6px;">2 · Upload the filled CSV</h3>
        <p style="color:var(--text-muted);font-size:13px;margin-bottom:14px;">Every row is validated before anything is created — bad rows are flagged, never silently skipped.</p>
        <input type="file" accept=".csv,text/csv" onchange="onBulkFileSelected(this)" class="input" style="max-width:420px;" />
      </div>
      ${rows.length ? `
      <div class="card card-pad">
        <h3 style="font-size:14.5px;margin-bottom:6px;">3 · Review &amp; issue</h3>
        <p style="color:var(--text-muted);font-size:13px;margin-bottom:14px;">
          <strong style="color:var(--success);">${okCount} ready</strong>${badCount ? ` · <strong style="color:var(--danger);">${badCount} need fixes</strong> (hover for details)` : ""}${rows.length > 50 ? ` · showing first 50 of ${rows.length}` : ""}.
          Only valid rows will be issued.</p>
        <div style="overflow-x:auto;margin-bottom:16px;">
          <table class="tbl"><thead><tr><th>#</th><th>Full name</th><th>Course</th><th>Status</th></tr></thead>
          <tbody>${previewRows}</tbody></table>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-primary" type="button" onclick="onBulkIssue()" ${okCount ? "" : "disabled"}>${ic("cert")} Issue ${okCount} certificate${okCount === 1 ? "" : "s"}</button>
          <button class="btn btn-outline" type="button" onclick="nav('/admin/students')">Cancel</button>
        </div>
      </div>` : ""}
    </div>`);
}
```

## 4) Post-apply verification

Same bar as REDESIGN-REPORT.md §4:
1. Extract both `<script>` blocks → `node --check` must pass.
2. Open `#/admin/students/bulk`: template downloads, upload the template itself (1 example row → "1 of 1 rows ready"), issue → credentials CSV downloads, student appears in the students list with an ACTIVE certificate, and the code verifies at `#/v/<certificateCode>`.
3. Upload a CSV with a bad email + future completion date → both rows flagged "Fix needed" with hover details; Issue button counts only valid rows.

## 5) Honesty caveat (same spirit as the pricing draft)

Demo-only: everything is in-memory, no server round-trip. The real Next.js app needs
server-side CSV upload (streaming parse, row-level transaction + rollback), a background
job for large files, and — per roadmap item #2 — email delivery of credentials instead of
a credentials CSV the admin forwards manually. Don't promise institutes an SLA on this
until the backend path exists.
