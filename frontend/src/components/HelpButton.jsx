import { Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

// Tài liệu hướng dẫn sử dụng (HTML tĩnh trong public/), mở ở tab mới khi bấm nút "?".
const USER_GUIDE_URL = `${import.meta.env.BASE_URL}huong-dan-su-dung.html`;

/**
 * Nút "?" trên topbar: hover hiện tooltip "Hướng dẫn sử dụng",
 * click mở tài liệu hướng dẫn ở tab mới.
 * `className` để tái dùng style icon sẵn có (vd "action-icon" ở dashboard).
 */
export default function HelpButton({ className = '' }) {
  const openGuide = () => window.open(USER_GUIDE_URL, '_blank', 'noopener,noreferrer');

  return (
    <Tooltip title="Hướng dẫn sử dụng" placement="bottom">
      <QuestionCircleOutlined
        className={`help-button ${className}`.trim()}
        role="button"
        tabIndex={0}
        aria-label="Hướng dẫn sử dụng"
        onClick={openGuide}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openGuide();
          }
        }}
      />
    </Tooltip>
  );
}
