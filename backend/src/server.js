import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import prisma from './config/prisma.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    const users = await prisma.users.findMany();
    res.json({ message: 'Kết nối miniERP thành công qua Prisma 7!', users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});