const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");
const { updatePlayerScores } = require("./players");

// Add verification log
if (!updatePlayerScores) {
    throw new Error('updatePlayerScores function not imported correctly');
}

const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = "demol";
const containerId = "Candidates";
const client = new CosmosClient({ endpoint, key });

async function recalculateScores(context, container, candidateId, isEliminated, isMol) {
    try {
        context.log('🎲 Starting score recalculation...');
        
        // Get all votes for this candidate from Votes container
        const votesContainer = client.database(databaseId).container('Votes');
        const { resources: votes } = await votesContainer.items
            .query({
                query: "SELECT * FROM Votes v WHERE v.candidate = @candidateId",
                parameters: [{ name: "@candidateId", value: candidateId }]
            })
            .fetchAll();
        
        context.log(`📊 Found ${votes.length} votes for candidate ${candidateId}`);
        context.log('🔍 Votes:', votes);

        // Get all players
        const { resources: players } = await client
            .database(databaseId)
            .container('Players')
            .items
            .query('SELECT * FROM Players')
            .fetchAll();
        context.log(`👥 Found ${players.length} players to update`);

        // Create a map of player scores
        const playerScores = {};
        players.forEach(player => {
            playerScores[player.id] = player.points || 0;
        });

        // Process votes and update scores
        votes.forEach(vote => {
            if (playerScores[vote.name] === undefined) return;

            if (isMol) {
                playerScores[vote.name] += vote.points;
                context.log(`➕ Adding ${vote.points} points for player ${vote.name} (Mol vote)`);
            } else if (isEliminated) {
                const playerLastVote = votes
                    .filter(v => v.name === vote.name)
                    .sort((a, b) => b.episode - a.episode)[0];
                
                if (vote === playerLastVote) {
                    playerScores[vote.name] -= vote.points;
                    context.log(`➖ Subtracting ${vote.points} points for player ${vote.name} (elimination)`);
                }
            }
        });

        context.log('💾 Sending score updates to players API:', playerScores);
        await updatePlayerScores(playerScores);
        context.log('✅ Score recalculation complete');
    } catch (error) {
        context.log.error('❌ Error in recalculateScores:', error);
        throw new Error(`Error recalculating scores: ${error.message}`);
    }
}

app.http('candidates', {
    methods: ['GET', 'PATCH'],
    route: "candidates/{id?}",
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);
        const database = client.database(databaseId);
        const container = database.container(containerId);

        try {
            // Handle GET request
            if (request.method === 'GET') {
                const { resources: candidates } = await container.items
                    .query('SELECT * FROM Candidates')
                    .fetchAll();

                return { 
                    status: 200,
                    body: JSON.stringify(candidates)
                };
            }

            // Handle PATCH request
            if (request.method === 'PATCH') {
                const candidateId = request.params.id;
                context.log('📝 Processing PATCH request for candidate:', candidateId);
                
                if (!candidateId) {
                    return {
                        status: 400,
                        body: JSON.stringify({ error: "Candidate ID is required" })
                    };
                }

                const updates = await request.json();
                context.log('📦 Update payload:', updates);

                // Get existing candidate
                const { resource: existingCandidate } = await container
                    .item(candidateId, candidateId)
                    .read();
                context.log('📋 Existing candidate:', existingCandidate);

                if (!existingCandidate) {
                    return {
                        status: 404,
                        body: JSON.stringify({ error: "Candidate not found" })
                    };
                }

                // Check if elimination status or mol status changed
                const eliminationChanged = updates.eliminatedweek !== undefined && 
                    updates.eliminatedweek !== existingCandidate.eliminatedweek;
                const molStatusChanged = updates.isMol !== undefined && 
                    updates.isMol !== existingCandidate.isMol;

                context.log('🔍 Status changes:', {
                    eliminationChanged,
                    molStatusChanged,
                    newEliminatedWeek: updates.eliminatedweek,
                    oldEliminatedWeek: existingCandidate.eliminatedweek,
                    newIsMol: updates.isMol,
                    oldIsMol: existingCandidate.isMol
                });

                // Merge updates with existing data
                const updatedCandidate = {
                    ...existingCandidate,
                    ...updates,
                    id: candidateId // Ensure ID remains unchanged
                };

                // Update the document
                await container.item(candidateId, candidateId).replace(updatedCandidate);
                context.log('✅ Candidate updated successfully');

                // Recalculate scores if needed
                if (eliminationChanged || molStatusChanged) {
                    context.log('🎲 Starting score recalculation...');
                    await recalculateScores(
                        context,
                        container,
                        candidateId,
                        updates.eliminatedweek !== null && updates.eliminatedweek !== undefined,
                        updates.isMol === true
                    );
                } else {
                    context.log('ℹ️ No score recalculation needed');
                }

                return {
                    status: 200,
                    body: JSON.stringify(updatedCandidate)
                };
            }

            return {
                status: 405,
                body: JSON.stringify({ error: "Method not allowed" })
            };

        } catch (error) {
            context.log.error('❌ Error processing candidates request:', error);
            return {
                status: 500,
                body: JSON.stringify({ error: error.message })
            };
        }
    }
});
