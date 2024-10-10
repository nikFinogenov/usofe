const express = require('express');
const initializeSequelize = require('./migrations/sequelize');
const adminRouter = require('./services/adminService');
const app = express();

const PORT = process.env.PORT || 3000;

const requiredEnvVars = ['PG_USER', 'JWT_SECRET', 'TOKEN_EXPIRATION', 'EMAIL_USER', 'EMAIL_PASS', 'FRONTEND_URL'];

requiredEnvVars.forEach((envVar) => {
    if (!process.env[envVar]) {
        console.error(`ERROR: Missing environment variable: ${envVar}`);
        process.exit(1);
    }
});

app.use(express.json());

initializeSequelize()
    .then(() => {
        console.log("Database setup complete.");
    })
    .catch(err => {
        console.error("Error during database setup:", err);
    });

app.use('/admin', adminRouter);

app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/comments', require('./routes/commentRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
