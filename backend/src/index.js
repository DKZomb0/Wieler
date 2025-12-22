const { app } = require('@azure/functions');

app.setup({
    enableHttpStream: true,
});

require('./functions/login');
require('./functions/races');
