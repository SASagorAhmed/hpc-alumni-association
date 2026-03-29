/**
 * Stores the human-readable committee role line for directory / profile (admin-only writes).
 * Derived from committee_members for the published current term; recomputed on committee CRUD.
 */
async function ensureAdminCommitteeDesignationColumn(pool) {
  try {
    await pool.query(
      "ALTER TABLE profiles ADD COLUMN `admin_committee_designation` VARCHAR(600) NULL"
    );
  } catch (e) {
    const msg = String(e?.message || "");
    const code = e?.code ?? e?.errno;
    if (String(code) === "1060" || msg.toLowerCase().includes("duplicate column")) return;
    console.error("[profiles] ensure admin_committee_designation:", msg.slice(0, 200));
  }
}

module.exports = { ensureAdminCommitteeDesignationColumn };
