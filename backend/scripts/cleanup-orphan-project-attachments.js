import prisma, { pool } from '../src/config/prisma.js';
import { listProjectAttachmentDirectories, removeProjectAttachmentDirectory } from '../src/utils/projectAttachments.js';
import { parseId } from '../src/utils/validators.js';

const apply = process.argv.includes('--apply');

try {
  const projects = await prisma.projects.findMany({ select: { id: true } });
  const existingIds = new Set(projects.map(({ id }) => String(id)));
  const directories = await listProjectAttachmentDirectories();
  const orphanIds = directories
    .map((name) => ({ name, id: parseId(name) }))
    .filter(({ name, id }) => id && String(id) === name && !existingIds.has(name));

  if (!orphanIds.length) {
    console.log('Không tìm thấy thư mục attachment dự án mồ côi.');
  } else if (!apply) {
    console.log('Chế độ xem trước; chưa xóa thư mục nào:');
    for (const { name } of orphanIds) console.log(`- projects/${name}`);
    console.log(`Tổng: ${orphanIds.length}. Chạy lại với --apply để xóa.`);
  } else {
    let failed = 0;
    for (const { name, id } of orphanIds) {
      try {
        await removeProjectAttachmentDirectory(id);
        console.log(`Đã xóa projects/${name}`);
      } catch (error) {
        failed += 1;
        console.error(`Không thể xóa projects/${name}:`, error.message);
      }
    }
    if (failed) process.exitCode = 1;
    console.log(`Đã xử lý ${orphanIds.length - failed}/${orphanIds.length} thư mục mồ côi.`);
  }
} catch (error) {
  console.error('Không quét được attachment dự án mồ côi:', error.code || error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
  await pool.end();
}
