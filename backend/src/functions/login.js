const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");

const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = "demol";
const playersContainerId = "Players";
const client = new CosmosClient({ endpoint, key });

app.http('login', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);
        try {
            const database = client.database(databaseId);
            const container = database.container(playersContainerId);

            // Get the code from the request body
            const { code } = await request.json();

            if (!code) {
                return {
                    status: 400,
                    body: JSON.stringify({ error: "Code is required" })
                };
            }

            // Query the database for a player with matching login code
            const querySpec = {
                query: "SELECT p.name, p.role FROM Players p WHERE p.login = @code",
                parameters: [
                    {
                        name: "@code",
                        value: code.toUpperCase()
                    }
                ]
            };

            const { resources } = await container.items.query(querySpec).fetchAll();

            if (resources.length === 0) {
                return {
                    status: 401,
                    body: JSON.stringify({ error: "Invalid code" })
                };
            }

            return {
                status: 200,
                body: JSON.stringify({ 
                    name: resources[0].name,
                    role: resources[0].role || 'user' // Default to 'user' if role is not set
                })
            };
        } catch (error) {
            context.log(`Error in login function: ${error.message}`);
            return {
                status: 500,
                body: JSON.stringify({ error: "Internal server error" })
            };
        }
    }
}); 