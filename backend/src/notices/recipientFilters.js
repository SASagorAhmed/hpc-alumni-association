function normalizeArray(v) {
  if (Array.isArray(v)) return v.map((x) => String(x || "").trim()).filter(Boolean);
  if (v == null || v === "") return [];
  return [String(v).trim()].filter(Boolean);
}

function normalizeFilterInput(input) {
  const src = input || {};
  return {
    include_admins: src.include_admins !== false,
    batch: normalizeArray(src.batch),
    blood_group: normalizeArray(src.blood_group),
    profession: normalizeArray(src.profession),
    gender: normalizeArray(src.gender),
    university: normalizeArray(src.university),
    department: normalizeArray(src.department),
    send_mode: ["individual", "cc", "bcc"].includes(String(src.send_mode || "").toLowerCase())
      ? String(src.send_mode).toLowerCase()
      : "individual",
  };
}

function appendInFilter({ values, column, where, params }) {
  if (!values.length) return;
  where.push(`TRIM(COALESCE(${column}, '')) IN (${values.map(() => "?").join(",")})`);
  params.push(...values);
}

function buildFilterSql(filter) {
  const f = normalizeFilterInput(filter);
  const where = [];
  const params = [];

  if (!f.include_admins) {
    where.push("NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role = 'admin')");
  }

  appendInFilter({ values: f.batch, column: "p.batch", where, params });
  appendInFilter({ values: f.blood_group, column: "p.blood_group", where, params });
  appendInFilter({ values: f.profession, column: "p.profession", where, params });
  appendInFilter({ values: f.gender, column: "p.gender", where, params });
  appendInFilter({ values: f.university, column: "p.university", where, params });
  appendInFilter({ values: f.department, column: "p.department", where, params });

  return { whereSql: where.length ? ` AND ${where.join(" AND ")}` : "", params, normalized: f };
}

async function listRecipientsWithEligibility(pool, filterInput) {
  const { whereSql, params, normalized } = buildFilterSql(filterInput);

  const [rows] = await pool.query(
    `SELECT
      u.id AS user_id,
      TRIM(COALESCE(u.email,'')) AS email,
      COALESCE(u.email_verified,0) AS email_verified,
      COALESCE(p.verified,0) AS profile_verified,
      p.name,
      p.photo,
      p.batch,
      p.blood_group,
      p.profession,
      p.gender,
      p.university,
      p.department,
      EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role = 'admin') AS is_admin
     FROM users u
     LEFT JOIN profiles p ON p.id = u.id
     WHERE 1=1 ${whereSql}
     ORDER BY u.email ASC`,
    params
  );

  const recipients = (rows || []).map((r) => {
    const email = String(r.email || "").trim().toLowerCase();
    const hasEmail = !!email;
    const verified = Number(r.email_verified || 0) === 1 || Number(r.profile_verified || 0) === 1;
    const eligible = hasEmail && verified;
    return {
      user_id: r.user_id,
      email,
      name: r.name || "",
      photo: r.photo || "",
      batch: r.batch || "",
      blood_group: r.blood_group || "",
      profession: r.profession || "",
      gender: r.gender || "",
      university: r.university || "",
      department: r.department || "",
      is_admin: Number(r.is_admin || 0) === 1,
      hasEmail,
      verified,
      eligible,
    };
  });

  const summary = {
    total_selected: recipients.length,
    total_eligible_verified: recipients.filter((r) => r.eligible).length,
    excluded_unverified: recipients.filter((r) => r.hasEmail && !r.verified).length,
    excluded_missing_email: recipients.filter((r) => !r.hasEmail).length,
  };

  return { recipients, summary, normalizedFilter: normalized };
}

async function listFilterOptions(pool) {
  const [rows] = await pool.query(
    `SELECT
      TRIM(COALESCE(p.batch, '')) AS batch,
      TRIM(COALESCE(p.blood_group, '')) AS blood_group,
      TRIM(COALESCE(p.profession, '')) AS profession,
      TRIM(COALESCE(p.gender, '')) AS gender,
      TRIM(COALESCE(p.university, '')) AS university,
      TRIM(COALESCE(p.department, '')) AS department
     FROM users u
     LEFT JOIN profiles p ON p.id = u.id
     WHERE (COALESCE(u.email_verified,0) = 1 OR COALESCE(p.verified,0) = 1)`
  );

  const uniq = {
    batch: new Set(),
    blood_group: new Set(),
    profession: new Set(),
    gender: new Set(),
    university: new Set(),
    department: new Set(),
  };

  for (const r of rows || []) {
    for (const k of Object.keys(uniq)) {
      const v = String(r?.[k] || "").trim();
      if (v) uniq[k].add(v);
    }
  }

  return {
    batch: Array.from(uniq.batch).sort((a, b) => String(a).localeCompare(String(b))),
    blood_group: Array.from(uniq.blood_group).sort((a, b) => String(a).localeCompare(String(b))),
    profession: Array.from(uniq.profession).sort((a, b) => String(a).localeCompare(String(b))),
    gender: Array.from(uniq.gender).sort((a, b) => String(a).localeCompare(String(b))),
    university: Array.from(uniq.university).sort((a, b) => String(a).localeCompare(String(b))),
    department: Array.from(uniq.department).sort((a, b) => String(a).localeCompare(String(b))),
  };
}

module.exports = {
  normalizeFilterInput,
  buildFilterSql,
  listRecipientsWithEligibility,
  listFilterOptions,
};
