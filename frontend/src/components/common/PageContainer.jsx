/**
 * Khung nội dung chuẩn cho mọi trang bên trong layout (sidebar + topbar).
 * Thay cho việc lặp lại `<div style={{ padding: '24px 32px' }}>` ở từng trang.
 *
 * <PageContainer>
 *   <PageHeader ... />
 *   ...
 * </PageContainer>
 */
export default function PageContainer({ children, style, ...rest }) {
  return (
    <div style={{ padding: '24px 32px', ...style }} {...rest}>
      {children}
    </div>
  );
}
