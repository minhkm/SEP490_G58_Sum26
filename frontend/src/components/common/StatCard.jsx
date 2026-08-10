import { Card, Typography, theme } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * Thẻ chỉ số (KPI) dùng chung cho dashboard và các trang tổng quan.
 * Thay cho các stat-card CSS tay (metric-stat-card, .stat-card...).
 *
 * <StatCard
 *   title="QUẢN LÝ ĐỘI TÀU"
 *   value={12}
 *   icon={<ContainerOutlined />}
 *   tone="blue"
 *   footer="Xem danh sách tàu"
 *   onClick={() => navigate('/vessels')}
 * />
 */

// Tông màu cho "viên" icon — accent trang trí. Tone 'blue' bám token màu thương hiệu (xử lý trong component).
const TONES = {
  indigo: { bg: '#ECEBFB', color: '#5B54D6' },
  cyan: { bg: '#E2F5F6', color: '#0E9AA6' },
  green: { bg: '#E4F6EE', color: '#0F9D6E' },
  gold: { bg: '#FCF1DC', color: '#B7791F' },
  red: { bg: '#FCE9EA', color: '#D33B41' },
  slate: { bg: '#EEF1F5', color: '#475569' },
};

export default function StatCard({
  title,
  value,
  icon,
  tone = 'blue',
  footer,
  onClick,
  loading = false,
  style,
  ...rest
}) {
  const { token } = theme.useToken();
  // tone 'blue' dùng màu thương hiệu (primary) để luôn khớp theme; các tone khác là accent riêng.
  const blueTone = { bg: '#E6F0FB', color: token.colorPrimary };
  const t = tone === 'blue' ? blueTone : (TONES[tone] || blueTone);
  const clickable = typeof onClick === 'function';

  return (
    <Card
      hoverable={clickable}
      onClick={onClick}
      loading={loading}
      style={{ height: '100%', cursor: clickable ? 'pointer' : 'default', ...style }}
      styles={{ body: { padding: 20 } }}
      {...rest}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <Text style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#64748b' }}>
          {title}
        </Text>
        {icon && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 10,
              background: t.bg,
              color: t.color,
              fontSize: 18,
              flex: '0 0 auto',
            }}
          >
            {icon}
          </span>
        )}
      </div>

      <div style={{ fontSize: 28, fontWeight: 700, color: token.colorTextHeading, lineHeight: 1.2, marginTop: 8 }}>
        {value}
      </div>

      {footer && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, color: t.color, fontSize: 13, fontWeight: 500 }}>
          <span>{footer}</span>
          {clickable && <ArrowRightOutlined style={{ fontSize: 12 }} />}
        </div>
      )}
    </Card>
  );
}
