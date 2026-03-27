/**
 * Strip PII from committee_members rows for unauthenticated public API responses.
 * Aligns with sensitive-field gating on GET /api/public/committee/member/:id.
 */
function sanitizeCommitteeMemberForPublic(row) {
  if (!row || typeof row !== "object") return row;
  return {
    id: row.id,
    term_id: row.term_id,
    post_id: row.post_id,
    name: row.name,
    designation: row.designation,
    category: row.category,
    batch: row.batch,
    alumni_id: row.alumni_id,
    candidate_number: row.candidate_number,
    college_name: row.college_name,
    institution: row.institution,
    job_status: row.job_status,
    profession: row.profession,
    about: row.about,
    wishing_message: row.wishing_message,
    winner_about: row.winner_about,
    photo_url: row.photo_url,
    display_order: row.display_order,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

module.exports = { sanitizeCommitteeMemberForPublic };
