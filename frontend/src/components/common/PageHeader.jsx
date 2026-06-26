import { Row, Col, Typography, Button, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

/**
 * Tiêu đề trang dùng chung: (tùy chọn) nút quay lại + dòng breadcrumb nhỏ (có icon)
 * + tiêu đề lớn, và khu hành động bên phải (nút "Tạo...", bộ lọc...).
 *
 * <PageHeader
 *   icon={<CompassOutlined />}
 *   breadcrumb="Voyages"
 *   title="Danh sách hải trình"
 *   extra={<Button type="primary" icon={<PlusOutlined />}>Tạo hải trình</Button>}
 * />
 *
 * Trang chi tiết / thêm mới — thêm nút quay lại:
 * <PageHeader onBack={() => navigate('/vessels')} title="Chi tiết tàu" />
 */
export default function PageHeader({ icon, breadcrumb, title, extra, onBack, style }) {
  return (
    <Row justify="space-between" align="middle" style={{ marginBottom: 24, ...style }}>
      <Col>
        <Space align="center" size={12}>
          {onBack && (
            <Button shape="circle" icon={<ArrowLeftOutlined />} onClick={onBack} aria-label="Quay lại" />
          )}
          <div>
            {breadcrumb && (
              <Text type="secondary">
                {icon} {breadcrumb}
              </Text>
            )}
            <Title level={3} style={{ margin: 0 }}>
              {title}
            </Title>
          </div>
        </Space>
      </Col>
      {extra && <Col>{extra}</Col>}
    </Row>
  );
}
