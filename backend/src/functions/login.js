const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");

const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = "demol";
const announcersContainerId = "Announcers";
const client = new CosmosClient({ endpoint, key });

app.http('login', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);
        try {
            const database = client.database(databaseId);
            const container = database.container(announcersContainerId);

            const { code } = await request.json();

            if (!code) {
                return {
                    status: 400,
                    body: JSON.stringify({ error: "Code is required" })
                };
            }

            const querySpec = {
                query: "SELECT a.name FROM Announcers a WHERE a.loginCode = @code",
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
                    name: resources[0].name
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
