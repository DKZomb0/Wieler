const db = require("./_db");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const code = req.body?.code;
  if (!code) return res.status(400).json({ error: "Code is required" });

  const { data, error } = await db
    .from("announcers")
    .select("name")
    .eq("loginCode", String(code).toUpperCase())
    .maybeSingle();

  if (error) return res.status(500).json({ error: "Internal server error" });
  if (!data) return res.status(401).json({ error: "Invalid code" });
  res.status(200).json({ name: data.name });
};
