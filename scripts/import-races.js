// One-off: import a Cosmos Data Explorer export into Supabase race_results.
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/import-races.js races.json "Cosmos owner name" user@email.com [--dry]
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const [file, ownerName, email] = process.argv.slice(2);
const dry = process.argv.includes("--dry");
if (!file || !ownerName || !email) {
  console.error('Usage: node scripts/import-races.js races.json "Owner name" user@email.com [--dry]');
  process.exit(1);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const all = JSON.parse(fs.readFileSync(file, "utf8"));
const mine = all.filter((r) => r.owner === ownerName);
const rows = [];
const skipped = [];
for (const r of mine) {
  const score = parseInt(r.score, 10);
  if (!r.racerName || !r.raceName || !r.raceDate || Number.isNaN(score)) skipped.push(r);
  else rows.push({
    ...(UUID.test(r.id) && { id: r.id }), // keep Cosmos ids so re-running never duplicates
    racerName: r.racerName, raceName: r.raceName, score, raceDate: r.raceDate,
    categorie: r.categorie || null, team: r.team || null,
    ...(r.createdAt && { createdAt: r.createdAt }), updatedAt: r.updatedAt || null,
  });
}
console.log(`${all.length} in file, ${mine.length} owned by "${ownerName}", ${rows.length} valid, ${skipped.length} skipped as invalid`);
if (dry) process.exit(0);

(async () => {
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error(`No Supabase user with email ${email}. Sign up first.`);

  // rows without a valid id get a new one and would duplicate on a re-run
  const withId = rows.filter((r) => r.id), withoutId = rows.filter((r) => !r.id);
  for (let i = 0; i < withId.length; i += 500) {
    const batch = withId.slice(i, i + 500).map((r) => ({ ...r, owner: user.id }));
    const { error } = await db.from("race_results").upsert(batch, { onConflict: "id" });
    if (error) throw error;
    console.log(`upserted ${Math.min(i + 500, withId.length)}/${withId.length}`);
  }
  if (withoutId.length) {
    const { error } = await db.from("race_results").insert(withoutId.map((r) => ({ ...r, owner: user.id })));
    if (error) throw error;
  }
  const { count } = await db.from("race_results").select("*", { count: "exact", head: true }).eq("owner", user.id);
  console.log(`done: ${user.email} now has ${count} races (imported ${rows.length})`);
})().catch((e) => { console.error(e.message); process.exit(1); });
