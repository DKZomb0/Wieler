const dbFor = require("./_db");

const FIELDS = ["racerName", "raceName", "score", "raceDate", "categorie", "team"];

module.exports = async (req, res) => {
  const token = (req.headers.authorization || "").replace(/^Bearer /, "");
  const db = dbFor(token);
  const { data: auth } = await db.auth.getUser(token);
  if (!auth?.user) return res.status(401).json({ error: "Not logged in" });
  const userId = auth.user.id;

  const { search, racer, id } = req.query;
  const table = () => db.from("race_results");
  const fail = (error) => res.status(500).json({ error: error.message });

  if (req.method === "GET") {
    let q = table().select("*");
    if (search !== undefined) {
      const s = search.trim();
      if (!s) return res.status(200).json([]);
      // escape LIKE wildcards so user input is matched literally
      const { data, error } = await q.ilike("racerName", `%${s.replace(/[\\%_]/g, "\\$&")}%`);
      if (error) return fail(error);
      return res.status(200).json([...new Set(data.map((r) => r.racerName))]);
    }
    if (racer) q = q.eq("racerName", racer);
    q = q.order("raceDate", { ascending: false });
    if (!racer) q = q.limit(20);
    const { data, error } = await q;
    return error ? fail(error) : res.status(200).json(data);
  }

  if (req.method === "POST" || req.method === "PUT" || req.method === "DELETE") {
    // The database enforces this too; checking first gives a clear 403 instead of a silent miss.
    const { data: grants, error } = await db.from("group_members").select("group_id").eq("can_write", true).limit(1);
    if (error) return fail(error);
    if (!grants.length) return res.status(403).json({ error: "Je hebt geen schrijfrechten" });
    req.groupId = grants[0].group_id;
  }

  if (req.method === "POST" || req.method === "PUT") {
    const b = req.body || {};
    if (!b.racerName || !b.raceName || !b.score || !b.raceDate) {
      return res.status(400).json({ error: "racerName, raceName, score and raceDate are required" });
    }
    const row = Object.fromEntries(FIELDS.map((f) => [f, b[f] || null]));
    row.score = b.score;

    if (req.method === "POST") {
      const { data, error } = await table().insert({ ...row, group_id: req.groupId, created_by: userId }).select().single();
      return error ? fail(error) : res.status(201).json(data);
    }
    if (!id) return res.status(400).json({ error: "id is required" });
    const { data, error } = await table()
      .update({ ...row, updatedAt: new Date().toISOString() })
      .eq("id", id).select().maybeSingle();
    if (error) return fail(error);
    return data ? res.status(200).json(data) : res.status(404).json({ error: "Race entry not found" });
  }

  if (req.method === "DELETE") {
    if (!id) return res.status(400).json({ error: "id is required" });
    const { data, error } = await table().delete().eq("id", id).select();
    if (error) return fail(error);
    return data.length ? res.status(204).end() : res.status(404).json({ error: "Race entry not found" });
  }

  res.status(405).json({ error: "Method not allowed" });
};
