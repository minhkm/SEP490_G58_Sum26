import { Card, Empty } from 'antd';

/**
 * Khung Card chuẩn cho biểu đồ dashboard: tiêu đề + chiều cao cố định + trạng thái rỗng.
 *
 * <ChartCard title="Tình trạng đội tàu" empty={data.length === 0}>
 *   <Pie ... />
 * </ChartCard>
 */
export default function ChartCard({ title, extra, empty = false, height = 260, children, style }) {
  return (
    <Card title={title} extra={extra} style={{ height: '100%', ...style }} styles={{ body: { padding: 16 } }}>
      <div style={{ height }}>
        {empty ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu" />
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}
