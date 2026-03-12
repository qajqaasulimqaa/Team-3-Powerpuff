import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import profilesRoutes from './routes/profiles.js';
import forumRoutes from './routes/forum.js';
import repliesRoutes from './routes/replies.js';
import newsRoutes from './routes/news.js';
import pinsRoutes from './routes/pins.js';
import activitiesRoutes from './routes/activities.js';
import newsdataRoutes from './routes/newsdata.js';
import postofthedayRoutes from './routes/postoftheday.js';

const app = express();

app.use(cors({
  origin: 'https://reiceseco.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/replies', repliesRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/pins', pinsRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/newsdata', newsdataRoutes);
app.use('/api/post-of-the-day', postofthedayRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));