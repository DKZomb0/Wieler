// One-off: copy Cosmos RaceResults for one owner straight into Supabase race_results.
// Usage: node scripts/migrate-cosmos.js "Cosmos owner name" "Group name" [--dry]
// Env: COSMOS_DB_ENDPOINT, COSMOS_DB_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
const { CosmosClient } = require("@azure/cosmos");
const { createClient } = require("@supabase/supabase-js");

const [ownerName, groupName] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const dry = process.argv.includes("--dry");
if (!ownerName || !groupName) {
  console.error('Usage: node scripts/migrate-cosmos.js "Owner name" "Group name" [--dry]');
  process.exit(1);
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

(async () => {
  const cosmos = new CosmosClient({ endpoint: process.env.COSMOS_DB_ENDPOINT, key: process.env.COSMOS_DB_KEY });
  const { resources } = await cosmos.database("wielerapp").container("RaceResults").items
    .query({ query: "SELECT * FROM c WHERE c.owner = @o", parameters: [{ name: "@o", value: ownerName }] })
    .fetchAll();

  const rows = [];
  let skipped = 0;
  for (const r of resources) {
    const score = parseInt(r.score, 10);
    if (!r.racerName || !r.raceName || !r.raceDate || Number.isNaN(score)) { skipped++; continue; }
    rows.push({
      id: UUID.test(r.id) ? r.id : undefined, // keep Cosmos ids so re-running never duplicates
      racerName: r.racerName, raceName: r.raceName, score, raceDate: r.raceDate,
      categorie: r.categorie || null, team: r.team || null,
      createdAt: r.createdAt || undefined, updatedAt: r.updatedAt || null,
    });
  }
  console.log(`Cosmos: ${resources.length} owned by "${ownerName}", ${rows.length} valid, ${skipped} skipped as invalid`);
  if (dry) return;

  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: group, error } = await db.from("groups").select("id").eq("name", groupName).maybeSingle();
  if (error) throw error;
  if (!group) throw new Error(`No group named "${groupName}".`);

  const withId = rows.filter((r) => r.id), withoutId = rows.filter((r) => !r.id);
  for (let i = 0; i < withId.length; i += 500) {
    const batch = withId.slice(i, i + 500).map((r) => ({ ...r, group_id: group.id }));
    const { error } = await db.from("race_results").upsert(batch, { onConflict: "id" });
    if (error) throw error;
    console.log(`upserted ${Math.min(i + 500, withId.length)}/${withId.length}`);
  }
  if (withoutId.length) { // no stable id, so these would duplicate on a re-run
    const { error } = await db.from("race_results").insert(withoutId.map((r) => ({ ...r, group_id: group.id })));
    if (error) throw error;
  }
  const { count } = await db.from("race_results").select("*", { count: "exact", head: true }).eq("group_id", group.id);
  console.log(`done: group "${groupName}" now has ${count} races`);
})().catch((e) => { console.error(e.message); process.exit(1); });
