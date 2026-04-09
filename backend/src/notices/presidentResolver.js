async function resolveCurrentPresidentName(pool) {
  if (!pool) return "";

  const [rows] = await pool.query(
    `SELECT cm.name
     FROM committee_members cm
     INNER JOIN committee_terms ct ON ct.id = cm.term_id
     LEFT JOIN committee_posts cp ON cp.id = cm.post_id
     WHERE ct.is_current = 1
       AND ct.status = 'published'
       AND COALESCE(cm.is_active, 1) = 1
       AND (
         LOWER(TRIM(COALESCE(cm.designation, ''))) LIKE '%president%'
         OR LOWER(TRIM(COALESCE(cp.title, ''))) LIKE '%president%'
         OR TRIM(COALESCE(cm.designation, '')) LIKE '%সভাপতি%'
         OR TRIM(COALESCE(cp.title, '')) LIKE '%সভাপতি%'
       )
     ORDER BY COALESCE(cm.display_order, 999999) ASC, cm.created_at ASC
     LIMIT 1`
  );

  const name = String(rows?.[0]?.name || "").trim();
  return name;
}

module.exports = { resolveCurrentPresidentName };
