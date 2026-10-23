import bcrypt from 'bcrypt';
import prisma from '../config/prisma.js';

export const changePassword = async (req, res) => {
  try {
    const userId = req.user.user_id; // Lấy ID user từ token
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới!' });
    }

    // 1. Tìm user theo 'user_id' thay vì 'id'
    const user = await prisma.users.findUnique({
      where: { user_id: Number(userId) }, // Đảm bảo userId là kiểu Số (Number)
      select: { password: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng!' });
    }

    // 2. So sánh mật khẩu cũ
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Mật khẩu cũ không chính xác!' });
    }

    // 3. Mã hóa mật khẩu mới
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // 4. Cập nhật lại mật khẩu theo 'user_id'
    await prisma.users.update({
      where: { user_id: Number(userId) },
      data: { password: hashedNewPassword }
    });

    return res.status(200).json({ message: 'Đổi mật khẩu thành công!' });

  } catch (error) {
    console.error('Lỗi đổi mật khẩu:', error);
    return res.status(500).json({ error: 'Lỗi server khi đổi mật khẩu!' });
  }
};