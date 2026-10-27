import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import prisma from './config/prisma.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import attendancesRoutes from './routes/attendancesRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    await prisma.users.count();
    res.json({ message: 'Kết nối miniERP thành công qua Prisma 7!' });
  } catch (error) {
    console.error('Health check thất bại:', error);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/attendances', attendancesRoutes);

const server = app.listen(PORT);
server.once('listening', () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
server.once('error', error => {
  console.error(error.code === 'EADDRINUSE'
    ? `Không thể khởi động: cổng ${PORT} đang được sử dụng.`
    : `Không thể mở cổng ${PORT}: ${error.code || error.name}`);
  process.exit(1);
});
