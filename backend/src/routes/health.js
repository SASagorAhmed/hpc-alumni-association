function healthRoute() {
  return async (req, res) => {
    res.status(200).json({ ok: true });
  };
}

module.exports = { healthRoute };

