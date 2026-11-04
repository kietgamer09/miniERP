import prisma, { pool } from '../src/config/prisma.js';
import { listAttachmentDirectories, removeAttachmentDirectoryEntry } from '../src/services/attachmentStorage.js';

const apply = process.argv.includes('--apply');

try {
  const [projects, tasks, leaves, overtime] = await Promise.all([
    prisma.projects.findMany({ select: { id: true } }),
    prisma.tasks.findMany({ select: { id: true } }),
    prisma.Day_off_requests.findMany({ select: { Day_off_id: true } }),
    prisma.$queryRaw`SELECT id FROM work_overtime_requests`,
  ]);
  const parentIds = {
    projects: new Set(projects.map(({ id }) => id)),
    tasks: new Set(tasks.map(({ id }) => id)),
    leaves: new Set(leaves.map(({ Day_off_id }) => Day_off_id)),
    overtime: new Set(overtime.map(({ id }) => Number(id))),
  };
  const directories = await listAttachmentDirectories();
  const orphans = directories.filter(({ type, id }) => !parentIds[type].has(id));

  if (!orphans.length) {
    console.log('Không tìm thấy thư mục attachment mồ côi.');
  } else if (!apply) {
    console.log('Chế độ xem trước; chưa xóa thư mục nào:');
    for (const { type, name } of orphans) console.log(`- ${type}/${name}`);
    console.log(`Tổng: ${orphans.length}. Chạy lại với --apply để xóa.`);
  } else {
    let failed = 0;
    for (const entry of orphans) {
      try {
        await removeAttachmentDirectoryEntry(entry.type, entry.name, entry.id, entry.quarantined);
        console.log(`Đã xóa ${entry.type}/${entry.name}`);
      } catch (error) {
        failed += 1;
        console.error(`Không thể xóa ${entry.type}/${entry.name}:`, error.message);
      }
    }
    if (failed) process.exitCode = 1;
    console.log(`Đã xử lý ${orphans.length - failed}/${orphans.length} thư mục mồ côi.`);
  }
} catch (error) {
  console.error('Không quét được attachment mồ côi:', error.code || error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
  await pool.end();
}
