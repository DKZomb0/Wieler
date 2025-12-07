const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");
const crypto = require("crypto");

const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = "demol";
const racesContainerId = "RaceResults";
const client = new CosmosClient({ endpoint, key });

function getAnnouncerName(request) {
    const announcer = request.headers.get("x-user-name");
    if (!announcer) {
        const error = new Error("Missing user context");
        error.status = 400;
        throw error;
    }
    return announcer;
}

app.http('races', {
    methods: ['GET', 'POST'],
    route: "races/{*route}",
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);
        try {
            const announcer = getAnnouncerName(request);
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
                            WHERE c.announcer = @announcer AND CONTAINS(LOWER(c.racerName), @search)
                        `,
                        parameters: [
                            { name: "@announcer", value: announcer },
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
                            WHERE c.announcer = @announcer AND c.racerName = @racer
                            ORDER BY c.raceDate DESC
                        `,
                        parameters: [
                            { name: "@announcer", value: announcer },
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
                const { racerName, raceName, score, raceDate } = await request.json();

                if (!racerName || !raceName || !score || !raceDate) {
                    return {
                        status: 400,
                        body: JSON.stringify({ error: "racerName, raceName, score and raceDate are required" }),
                        headers: { 'Content-Type': 'application/json' }
                    };
                }

                const entry = {
                    id: crypto.randomUUID(),
                    announcer,
                    racerName,
                    raceName,
                    score,
                    raceDate,
                    createdAt: new Date().toISOString()
                };

                await container.items.create(entry);

                return {
                    status: 201,
                    body: JSON.stringify(entry),
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
