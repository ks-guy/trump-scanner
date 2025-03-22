const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Serve static files from the test directory
app.use(express.static(path.join(__dirname)));

app.listen(port, () => {
    console.log(`Test server running at http://localhost:${port}`);
}); 