const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");
const crypto = require('crypto');

// Cosmos DB configuration
const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = "demol";
const containerId = "Votes";
const client = new CosmosClient({ endpoint, key });

app.http('votes', {
    methods: ['GET', 'POST', 'PATCH'],
    route: "votes/{*route}",  // Add route parameter to handle sub-routes
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);
        const database = client.database(databaseId);
        const container = database.container(containerId);

        try {
            // Handle vote totals request
            if (request.url.includes('/totals/')) {
                // Get episode number from URL
                const episode = parseInt(request.url.split('/').pop());
                
                if (isNaN(episode)) {
                    return {
                        status: 400,
                        body: JSON.stringify({ error: "Invalid episode number" }),
                        headers: { 'Content-Type': 'application/json' }
                    };
                }

                // Get vote totals for the specified episode
                const { resources: votes } = await container.items
                    .query({
                        query: `
                            SELECT c.candidate, SUM(c.points) as totalPoints
                            FROM c
                            WHERE c.episode = @episode
                            GROUP BY c.candidate
                        `,
                        parameters: [
                            { name: "@episode", value: episode }
                        ]
                    })
                    .fetchAll();

                // Calculate total points for percentage calculation
                const totalPoints = votes.reduce((sum, vote) => sum + vote.totalPoints, 0);

                // Convert to percentages
                const percentages = votes.reduce((acc, vote) => {
                    acc[vote.candidate] = Math.round((vote.totalPoints / totalPoints) * 100);
                    return acc;
                }, {});

                return {
                    status: 200,
                    body: JSON.stringify({
                        percentages,
                        episode
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                };
            }

            // Handle GET request
            if (request.method === 'GET' && !request.url.includes('/totals')) {
                const player = request.query.get('player');
                const episode = parseInt(request.query.get('episode'));

                if (!player || !episode) {
                    return { 
                        status: 400, 
                        body: "Missing required query parameters: 'player' and 'episode'" 
                    };
                }

                const querySpec = {
                    query: "SELECT * FROM c WHERE c.name = @player AND c.episode = @episode",
                    parameters: [
                        { name: "@player", value: player },
                        { name: "@episode", value: episode }
                    ]
                };

                const { resources: votes } = await container.items.query(querySpec).fetchAll();

                return { 
                    status: 200, 
                    body: JSON.stringify(votes),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                };
            }

            // Handle POST request
            if (request.method === 'POST') {
                const body = await request.json();
                const { player, episode, scores } = body;

                if (!player || !scores) {
                    return { 
                        status: 400, 
                        body: "Missing required fields: 'player' and 'scores'" 
                    };
                }

                // Create an array of promises for each vote
                const votePromises = Object.entries(scores).map(([candidate, points]) => {
                    const voteGuid = crypto.randomUUID();
                    const vote = {
                        id: voteGuid,
                        guid: voteGuid,
                        name: player,
                        candidate: candidate,
                        points: points,
                        episode: episode,
                        timestamp: new Date().toISOString(),
                    };
                    return container.items.create(vote);
                });

                // Wait for all votes to be saved
                await Promise.all(votePromises);

                return { 
                    status: 201, 
                    body: JSON.stringify({ message: "Votes saved successfully!" }) 
                };
            }

            // Handle PATCH request
            if (request.method === 'PATCH') {
                const body = await request.json();
                const { player, episode, scores } = body;

                if (!player || !scores) {
                    return { 
                        status: 400, 
                        body: "Missing required fields: 'player' and 'scores'" 
                    };
                }

                // First fetch existing votes for this player and episode
                const querySpec = {
                    query: "SELECT * FROM c WHERE c.name = @player AND c.episode = @episode",
                    parameters: [
                        { name: "@player", value: player },
                        { name: "@episode", value: episode }
                    ]
                };

                const { resources: existingVotes } = await container.items.query(querySpec).fetchAll();

                // Delete existing votes
                const deletePromises = existingVotes.map(vote => 
                    container.item(vote.id, vote.id).delete()
                );
                await Promise.all(deletePromises);

                // Create new votes with updated scores
                const votePromises = Object.entries(scores).map(([candidate, points]) => {
                    const voteGuid = crypto.randomUUID();
                    const vote = {
                        id: voteGuid,
                        guid: voteGuid,
                        name: player,
                        candidate: candidate,
                        points: points,
                        episode: episode,
                        timestamp: new Date().toISOString(),
                    };
                    return container.items.create(vote);
                });

                await Promise.all(votePromises);

                return { 
                    status: 200, 
                    body: JSON.stringify({ message: "Votes updated successfully!" }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                };
            }

            return {
                status: 405,
                body: JSON.stringify({ error: "Method not allowed" })
            };

        } catch (error) {
            context.log.error('Error processing votes request:', error);
            return {
                status: 500,
                body: JSON.stringify({ 
                    error: "Internal Server Error",
                    details: error.message 
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            };
        }
    }
});
