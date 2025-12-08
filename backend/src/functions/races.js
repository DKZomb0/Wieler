const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");
const crypto = require("crypto");

const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = "wielerapp";
const racesContainerId = "RaceResults";

if (!endpoint || !key) {
    throw new Error("COSMOS_DB_ENDPOINT and COSMOS_DB_KEY must be set");
}

const client = new CosmosClient({ endpoint, key });

function getUserName(request) {
    const owner = request.headers.get("x-user-name");
    if (!owner) {
        const error = new Error("Missing user context");
        error.status = 400;
        throw error;
    }
    return owner;
}

app.http('races', {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    route: "races/{*route}",
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);
        try {
            const owner = getUserName(request);
            const database = client.database(databaseId);
            const container = database.container(racesContainerId);

            const search = request.query.get('search');
            const racer = request.query.get('racer');

            if (request.method === 'GET' && search !== null && search !== undefined) {
                const normalizedSearch = search.toString().trim();

                if (!normalizedSearch) {
                    return {
                        status: 200,
                        body: JSON.stringify([]),
                        headers: { 'Content-Type': 'application/json' }
                    };
                }

                const { resources } = await container.items
                    .query({
                        query: `
                            SELECT DISTINCT c.racerName
                            FROM c
                            WHERE c.owner = @owner AND CONTAINS(LOWER(c.racerName), @search)
                        `,
                        parameters: [
                            { name: "@owner", value: owner },
                            { name: "@search", value: normalizedSearch.toLowerCase() }
                        ]
                    })
                    .fetchAll();

                const names = resources.map(record => record.racerName);
                return {
                    status: 200,
                    body: JSON.stringify(names),
                    headers: { 'Content-Type': 'application/json' }
                };
            }

            if (request.method === 'GET' && racer) {
                const { resources } = await container.items
                    .query({
                        query: `
                            SELECT * FROM c
                            WHERE c.owner = @owner AND c.racerName = @racer
                            ORDER BY c.raceDate DESC
                        `,
                        parameters: [
                            { name: "@owner", value: owner },
                            { name: "@racer", value: racer }
                        ]
                    })
                    .fetchAll();

                return {
                    status: 200,
                    body: JSON.stringify(resources),
                    headers: { 'Content-Type': 'application/json' }
                };
            }

            if (request.method === 'POST') {
                const { racerName, raceName, score, raceDate, categorie, team } = await request.json();

                if (!racerName || !raceName || !score || !raceDate) {
                    return {
                        status: 400,
                        body: JSON.stringify({ error: "racerName, raceName, score and raceDate are required" }),
                        headers: { 'Content-Type': 'application/json' }
                    };
                }

                const entry = {
                    id: crypto.randomUUID(),
                    owner,
                    racerName,
                    raceName,
                    score,
                    raceDate,
                    categorie: categorie || null,
                    team: team || null,
                    createdAt: new Date().toISOString()
                };

                await container.items.create(entry);

                return {
                    status: 201,
                    body: JSON.stringify(entry),
                    headers: { 'Content-Type': 'application/json' }
                };
            }

            if (request.method === 'PUT') {
                const id = request.query.get('id');
                if (!id) {
                    return {
                        status: 400,
                        body: JSON.stringify({ error: "id is required" }),
                        headers: { 'Content-Type': 'application/json' }
                    };
                }

                const { racerName, raceName, score, raceDate, categorie, team } = await request.json();
                if (!racerName || !raceName || !score || !raceDate) {
                    return {
                        status: 400,
                        body: JSON.stringify({ error: "racerName, raceName, score and raceDate are required" }),
                        headers: { 'Content-Type': 'application/json' }
                    };
                }

                let existing;
                try {
                    const { resource } = await container.item(id, owner).read();
                    existing = resource;
                } catch (err) {
                    context.log.warn(`Race entry not found for update: ${id}`);
                }

                if (!existing) {
                    return {
                        status: 404,
                        body: JSON.stringify({ error: "Race entry not found" }),
                        headers: { 'Content-Type': 'application/json' }
                    };
                }

                const updated = {
                    ...existing,
                    racerName,
                    raceName,
                    score,
                    raceDate,
                    categorie: categorie || null,
                    team: team || null,
                    updatedAt: new Date().toISOString()
                };

                await container.items.upsert(updated);

                return {
                    status: 200,
                    body: JSON.stringify(updated),
                    headers: { 'Content-Type': 'application/json' }
                };
            }

            if (request.method === 'DELETE') {
                const id = request.query.get('id');
                if (!id) {
                    return {
                        status: 400,
                        body: JSON.stringify({ error: "id is required" }),
                        headers: { 'Content-Type': 'application/json' }
                    };
                }

                try {
                    await container.item(id, owner).delete();
                } catch (err) {
                    context.log.warn(`Race entry not found for delete: ${id}`);
                    return {
                        status: 404,
                        body: JSON.stringify({ error: "Race entry not found" }),
                        headers: { 'Content-Type': 'application/json' }
                    };
                }

                return {
                    status: 204,
                    body: null,
                    headers: { 'Content-Type': 'application/json' }
                };
            }

            return {
                status: 405,
                body: JSON.stringify({ error: "Method not allowed" }),
                headers: { 'Content-Type': 'application/json' }
            };
        } catch (error) {
            const status = error.status || 500;
            context.log.error('Error processing races request:', error);
            return {
                status,
                body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
                headers: { 'Content-Type': 'application/json' }
            };
        }
    }
});
