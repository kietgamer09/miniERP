import { useMemo, useState } from 'react';
import { Button, Card, Empty, Input, Modal, Space, Tag, Typography } from 'antd';
import { DownloadOutlined, FileTextOutlined, SearchOutlined } from '@ant-design/icons';

const documents = [
  {
    id: 'company-profile',
    title: 'Giới thiệu công ty',
    category: 'Thông tin chung',
    description: 'Mẫu giới thiệu tổng quan để nhân viên mới tìm hiểu về công ty.',
    updatedAt: 'Mẫu tham khảo',
    content: `GIỚI THIỆU CÔNG TY\n\nTên công ty: [Tên công ty]\nLĩnh vực hoạt động: [Lĩnh vực]\nĐịa chỉ: [Địa chỉ]\nWebsite: [Website]\n\nTẦM NHÌN VÀ SỨ MỆNH\n[Cập nhật tầm nhìn, sứ mệnh và giá trị cốt lõi của công ty.]\n\nCƠ CẤU TỔ CHỨC\n[Cập nhật các phòng ban và đầu mối liên hệ.]\n\nTài liệu mẫu: vui lòng thay nội dung trong dấu ngoặc vuông bằng thông tin đã được công ty xác nhận.`,
  },
  {
    id: 'employee-handbook',
    title: 'Sổ tay nhân viên',
    category: 'Nhân sự',
    description: 'Tổng hợp thông tin hội nhập, đầu mối hỗ trợ và các quy định cần biết.',
    updatedAt: 'Mẫu tham khảo',
    content: `SỔ TAY NHÂN VIÊN\n\n1. NGÀY ĐẦU TIÊN\n- Liên hệ bộ phận Nhân sự để hoàn tất hồ sơ và nhận hướng dẫn hội nhập.\n- Nhận tài khoản, thiết bị và quyền truy cập theo vị trí công việc.\n- Tìm hiểu cơ cấu phòng ban và người phụ trách trực tiếp.\n\n2. KÊNH HỖ TRỢ\nNhân sự: [Tên / email / số điện thoại]\nHỗ trợ kỹ thuật: [Tên / email / số điện thoại]\nQuản lý trực tiếp: [Thông tin liên hệ]\n\n3. QUY ĐỊNH NỘI BỘ\n[Cập nhật liên kết hoặc nội dung quy định đã được công ty phê duyệt.]\n\nĐây là khung tham khảo, không thay thế nội quy lao động chính thức.`,
  },
  {
    id: 'attendance-guide',
    title: 'Hướng dẫn chấm công',
    category: 'Hướng dẫn',
    description: 'Các bước chấm công và cách gửi giải trình khi có sai lệch.',
    updatedAt: 'Mẫu tham khảo',
    content: `HƯỚNG DẪN CHẤM CÔNG\n\n1. Chấm công vào đầu ca và chấm công ra khi kết thúc ca trên miniERP.\n2. Kiểm tra trạng thái và thời gian ghi nhận sau mỗi lần chấm.\n3. Nếu quên chấm hoặc dữ liệu chưa chính xác, gửi giải trình tại mục Chấm công và nêu rõ ngày, lý do.\n4. Theo dõi trạng thái xử lý giải trình trong mục tương ứng.\n\nGiờ làm việc áp dụng: [Cập nhật theo lịch làm việc đã được công ty phê duyệt.]\nĐầu mối hỗ trợ: [Bộ phận Nhân sự]\n\nThời hạn và quy trình duyệt cần được công ty xác nhận trước khi áp dụng.`,
  },
  {
    id: 'leave-guide',
    title: 'Quy trình xin nghỉ phép',
    category: 'Hướng dẫn',
    description: 'Hướng dẫn gửi đơn nghỉ và theo dõi kết quả phê duyệt.',
    updatedAt: 'Mẫu tham khảo',
    content: `QUY TRÌNH XIN NGHỈ PHÉP\n\n1. Tạo đơn nghỉ phép trong mục Chấm công / Nghỉ phép.\n2. Chọn thời gian nghỉ, loại nghỉ và nhập lý do.\n3. Gửi đơn để người có thẩm quyền xem xét.\n4. Theo dõi trạng thái đơn; chỉ nghỉ sau khi đơn được duyệt, trừ trường hợp khẩn cấp theo quy định công ty.\n\nThời gian báo trước: [Cập nhật quy định của công ty.]\nNgười phê duyệt: [Cập nhật theo cơ cấu quản lý.]\n\nĐây là hướng dẫn mẫu. Quy định chính thức của công ty được ưu tiên áp dụng.`,
  },
];

function downloadDocument(document) {
  const blob = new Blob([document.content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = `${document.title}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function CompanyDocuments() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const filtered = useMemo(() => documents.filter(item =>
    `${item.title} ${item.category} ${item.description}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')),
  ), [query]);

  return <main className="company-documents-page">
    <header className="company-documents-header">
      <div>
        <Typography.Title level={3}>Tài liệu công ty</Typography.Title>
        <Typography.Text type="secondary">Một số tài liệu tham khảo dành cho nhân viên. Vui lòng cập nhật thông tin theo quy định chính thức của công ty.</Typography.Text>
      </div>
      <Input allowClear value={query} onChange={event => setQuery(event.target.value)}
        prefix={<SearchOutlined />} placeholder="Tìm tài liệu..." aria-label="Tìm tài liệu" />
    </header>
    <div className="company-documents-grid">
      {filtered.map(item => <Card key={item.id} className="company-document-card" hoverable onClick={() => setSelected(item)}>
        <div className="company-document-icon"><FileTextOutlined /></div>
        <Space direction="vertical" size={8} className="company-document-body">
          <Space wrap><Typography.Text strong>{item.title}</Typography.Text><Tag>{item.category}</Tag></Space>
          <Typography.Text type="secondary">{item.description}</Typography.Text>
          <Typography.Text type="secondary" className="company-document-updated">{item.updatedAt}</Typography.Text>
          <Space>
            <Button type="link" onClick={event => { event.stopPropagation(); setSelected(item); }}>Xem nội dung</Button>
            <Button type="link" icon={<DownloadOutlined />} onClick={event => { event.stopPropagation(); downloadDocument(item); }}>Tải xuống</Button>
          </Space>
        </Space>
      </Card>)}
      {!filtered.length && <Empty description="Không tìm thấy tài liệu phù hợp" />}
    </div>
    <Modal open={Boolean(selected)} title={selected?.title} onCancel={() => setSelected(null)} footer={selected && <Space>
      <Button onClick={() => setSelected(null)}>Đóng</Button>
      <Button type="primary" icon={<DownloadOutlined />} onClick={() => downloadDocument(selected)}>Tải xuống</Button>
    </Space>} width={680}>
      {selected && <>
        <Tag color="blue">{selected.category}</Tag>
        <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>{selected.description}</Typography.Paragraph>
        <pre className="company-document-content">{selected.content}</pre>
      </>}
    </Modal>
  </main>;
}
