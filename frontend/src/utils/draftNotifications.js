export function draftNotification(draft) {
  const { scope, values, updatedAt } = draft;
  let path, label;
  let match;
  if ((match = /^project:(new|\d+)$/.exec(scope))) {
    path = match[1] === 'new' ? '/du-an/cua-toi' : `/du-an/${match[1]}`;
    label = `${match[1] === 'new' ? 'Tạo' : 'Sửa'} dự án${values.name ? ` · ${values.name}` : ''}`;
  } else if ((match = /^task:(\d+):(new|\d+)$/.exec(scope))) {
    path = `/du-an/${match[1]}`;
    label = `${match[2] === 'new' ? 'Tạo' : 'Sửa'} công việc${values.title ? ` · ${values.title}` : ''}`;
  } else if ((match = /^project-members:(\d+)$/.exec(scope))) {
    path = `/du-an/${match[1]}`; label = 'Thêm thành viên dự án';
  } else if ((match = /^comment:(project|task)-(\d+)$/.exec(scope))) {
    path = match[1] === 'project' ? `/du-an/${match[2]}` : '/viec-cua-toi/duoc-giao';
    label = match[1] === 'project' ? 'Thảo luận dự án' : 'Bình luận công việc';
  } else if (/^employee:(new|\d+)$/.test(scope)) {
    path = '/quan-ly-nhan-vien'; label = `Hồ sơ nhân viên${values.fullname ? ` · ${values.fullname}` : ''}`;
  } else if (/^department:(new|\d+)$/.test(scope)) {
    path = '/quan-ly-phong-ban'; label = 'Thông tin phòng ban';
  } else if ((match = /^attendance-explanation:(\d{4}-\d{2}-\d{2})$/.exec(scope))) {
    path = `/cham-cong/bang-cong?date=${match[1]}`; label = `Giải trình chấm công · ${match[1].split('-').reverse().join('/')}`;
  } else if (scope === 'leave:new') {
    path = '/cham-cong/nghi-phep'; label = 'Đơn xin nghỉ phép';
  } else if (scope === 'overtime:new') {
    path = '/lam-them'; label = 'Đơn làm thêm';
  } else return null;
  return { id: `draft:${scope}:${updatedAt}`, type: 'draft', draftScope: scope, path,
    title: 'Bạn có việc đang dở', description: `${label}. Bấm để tiếp tục bản nháp.`, time: new Date(updatedAt).toISOString() };
}
