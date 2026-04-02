const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

// A simple minimal endpoint to prove the Gateway reaches us!
app.get('/', (req, res) => {
    res.json({
        message: 'Successfully reached the Protected Audit Service! 📜'
    });
});

app.listen(5000, () => {
    console.log(`[Audit] Minimal testing service running on port 5000`);
});
