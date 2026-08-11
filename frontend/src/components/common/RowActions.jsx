import { Space, Button, Tooltip } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

/**
 * Cụm nút thao tác trên một dòng bảng: Xem / Sửa / Xoá.
 * Chỉ render nút khi truyền handler tương ứng. Có thể chèn thêm nút khác qua `children`.
 *
 * <RowActions
 *   onView={() => navigate(`/vessels/view/${v.id}`)}
 *   onEdit={() => navigate(`/vessels/edit/${v.id}`)}
 *   onDelete={() => handleDelete(v)}
 * />
 */
export default function RowActions({
  onView,
  onEdit,
  onDelete,
  viewTitle = 'Xem chi tiết',
  editTitle = 'Chỉnh sửa',
  deleteTitle = 'Xoá',
  editDisabled = false,
  editDisabledTooltip = 'Không thể chỉnh sửa',
  deleteDisabled = false,
  deleteDisabledTooltip = 'Không thể xoá',
  stopPropagation = false,
  children,
}) {
  return (
    <Space onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}>
      {children}
      {onView && (
        <Tooltip title={viewTitle}>
          <Button type="text" icon={<EyeOutlined />} onClick={onView} />
        </Tooltip>
      )}
      {onEdit && (
        <Tooltip title={editDisabled ? editDisabledTooltip : editTitle}>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={editDisabled ? undefined : onEdit}
            disabled={editDisabled}
          />
        </Tooltip>
      )}
      {onDelete && (
        <Tooltip title={deleteDisabled ? deleteDisabledTooltip : deleteTitle}>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={deleteDisabled ? undefined : onDelete}
            disabled={deleteDisabled}
          />
        </Tooltip>
      )}
    </Space>
  );
}
