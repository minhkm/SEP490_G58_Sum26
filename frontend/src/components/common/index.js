// Bộ component/helper dùng chung cho cả team. Import gọn:
//   import { PageHeader, PageContainer, StatCard, StatusTag, RowActions } from '../components/common';
export { default as PageHeader } from './PageHeader';
export { default as PageContainer } from './PageContainer';
export { default as StatCard } from './StatCard';
export { default as AppTopbar } from './AppTopbar';
export { default as StatusTag, getStatusColor, translateStatus } from './StatusTag';
export { default as RowActions } from './RowActions';

// Helper phản hồi (toast/confirm) — re-export để cùng một điểm import.
export {
  notifySuccess,
  notifyError,
  notifyWarning,
  notifyInfo,
  notify,
  confirmAction,
  confirmDelete,
} from '../../utils/feedback';
