const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");

const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = "demol";
const playersContainerId = "Players";
const client = new CosmosClient({ endpoint, key });

async function updatePlayerScores(playerScores) {
    try {
        const database = client.database(databaseId);
        const container = database.container(playersContainerId);

        // Update all players with new scores
        for (const [playerId, points] of Object.entries(playerScores)) {
            await container.item(playerId, playerId).patch([
                {
                    op: 'set',
                    path: '/points',
                    value: points
                }
            ]);
        }
    } catch (error) {
        throw new Error(`Error updating player scores: ${error.message}`);
    }
}

app.http('players', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);
        try {
            const database = client.database(databaseId);
            const container = database.container(playersContainerId);

            // Query to fetch all players
            const { resources: players } = await container.items.query('SELECT * FROM Players').fetchAll();

            return {
                status: 200,
                body: JSON.stringify(players)
            };
        } catch (error) {
            context.log(`Error fetching players: ${error.message}`);
            return { 
                status: 500, 
                body: "Internal Server Error" 
            };
        }
    }
});

module.exports = {
    updatePlayerScores
};
