// One-off: dump Cosmos RaceResults to races.json (pagination handled by fetchAll).
// Needs COSMOS_DB_ENDPOINT and COSMOS_DB_KEY in the environment; run `npm i --no-save @azure/cosmos` first.
const fs = require("fs");
const { CosmosClient } = require("@azure/cosmos");

const { COSMOS_DB_ENDPOINT: endpoint, COSMOS_DB_KEY: key } = process.env;
if (!endpoint || !key) {
  console.error("Set COSMOS_DB_ENDPOINT and COSMOS_DB_KEY");
  process.exit(1);
}

(async () => {
  const container = new CosmosClient({ endpoint, key }).database("wielerapp").container("RaceResults");
  const { resources } = await container.items
    .query("SELECT c.id, c.owner, c.racerName, c.raceName, c.score, c.raceDate, c.categorie, c.team, c.createdAt, c.updatedAt FROM c")
    .fetchAll();
  fs.writeFileSync("races.json", JSON.stringify(resources));
  console.log(`wrote ${resources.length} races to races.json`);
})().catch((e) => { console.error(e.message); process.exit(1); });
