const DEFAULT_PROVIDER = "brevo";
const DEFAULT_LIMIT = 300;

function getTodayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeLimit(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.floor(n);
}

async function getQuotaSnapshot(pool, { provider = DEFAULT_PROVIDER, limit = DEFAULT_LIMIT } = {}) {
  const today = getTodayDateKey();
  const lim = normalizeLimit(limit);
  const [rows] = await pool.query(
    `SELECT quota_date, provider, limit_count, sent_count
     FROM email_daily_quota
     WHERE quota_date = ? AND provider = ?
     LIMIT 1`,
    [today, provider]
  );

  const row = rows?.[0] || null;
  const sentCount = Number(row?.sent_count || 0);
  const limitCount = Number(row?.limit_count || lim);

  return {
    quota_date: today,
    provider,
    limit_count: limitCount,
    sent_count: sentCount,
    remaining_count: Math.max(limitCount - sentCount, 0),
  };
}

async function reserveQuota(pool, { requestedCount, provider = DEFAULT_PROVIDER, limit = DEFAULT_LIMIT }) {
  const today = getTodayDateKey();
  const lim = normalizeLimit(limit);
  const requested = Math.max(Number(requestedCount || 0), 0);
  if (!requested) {
    return { reserved_count: 0, remaining_before: 0, remaining_after: 0, limit_count: lim, sent_count: 0 };
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO email_daily_quota (quota_date, provider, limit_count, sent_count)
       VALUES (?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE limit_count = GREATEST(limit_count, VALUES(limit_count))`,
      [today, provider, lim]
    );

    const [rows] = await conn.query(
      `SELECT limit_count, sent_count
       FROM email_daily_quota
       WHERE quota_date = ? AND provider = ?
       FOR UPDATE`,
      [today, provider]
    );

    const row = rows?.[0];
    const currentLimit = Number(row?.limit_count || lim);
    const currentSent = Number(row?.sent_count || 0);
    const remainingBefore = Math.max(currentLimit - currentSent, 0);
    const reserved = Math.min(remainingBefore, requested);

    if (reserved > 0) {
      await conn.query(
        `UPDATE email_daily_quota
         SET sent_count = sent_count + ?
         WHERE quota_date = ? AND provider = ?`,
        [reserved, today, provider]
      );
    }

    await conn.commit();
    return {
      reserved_count: reserved,
      remaining_before: remainingBefore,
      remaining_after: Math.max(remainingBefore - reserved, 0),
      limit_count: currentLimit,
      sent_count: currentSent + reserved,
    };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = {
  DEFAULT_PROVIDER,
  DEFAULT_LIMIT,
  getQuotaSnapshot,
  reserveQuota,
};
