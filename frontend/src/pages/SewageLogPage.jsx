import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, InputNumber, Select, Input, Tag, message, Space, Card, Typography, Alert, DatePicker, Upload, Image } from 'antd';
import MasterLayout from '../components/MasterLayout';
import { PlusOutlined, CheckCircleOutlined, CloseCircleOutlined, UploadOutlined, PictureOutlined } from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

export default function SewageLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [form] = Form.useForm();
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const activeVoyageRole = localStorage.getItem('activeVoyageRole') || user.role;
  const activeVoyageId = localStorage.getItem('activeVoyageId');

  const isChief = activeVoyageRole === 'ChiefOfficer' || user.role === 'Admin';
  const isMaster = activeVoyageRole === 'Master' || user.role === 'Admin';

  const dischargeType = Form.useWatch('dischargeType', form);
  
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/sewage-logs/voyage/${activeVoyageId}`);
      setLogs(res.data);
    } catch (error) {
      console.error(error);
      message.error('Không thể tải dữ liệu nhật ký xả thải.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeVoyageId) {
      fetchLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVoyageId]);

  const handleCreateRequest = async (values) => {
    setSubmitting(true);
    try {
      const payloadData = {
        ...values,
        startPosition: `${values.latitude} - ${values.longitude}`,
        voyageId: activeVoyageId,
        plannedDischargeDate: values.plannedDischargeDate.toISOString()
      };
      
      const formData = new FormData();
      Object.keys(payloadData).forEach(key => {
        formData.append(key, payloadData[key]);
      });
      
      fileList.forEach(file => {
        formData.append('images', file.originFileObj);
      });

      await api.post('/sewage-logs', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      message.success('Đã tạo yêu cầu xả thải thành công.');
      setIsModalVisible(false);
      form.resetFields();
      setFileList([]);
      fetchLogs();
    } catch (error) {
      const msg = error.response?.data?.message || 'Lỗi khi tạo yêu cầu xả thải.';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadChange = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  const disabledDate = (current) => {
    // Không cho chọn ngày trong quá khứ (trước ngày hôm nay)
    return current && current < dayjs().startOf('day');
  };

  const disabledTime = (current) => {
    // Nếu chọn ngày hôm nay, không cho chọn giờ/phút trong quá khứ
    if (current && current.isSame(dayjs(), 'day')) {
      const currentHour = dayjs().hour();
      const currentMinute = dayjs().minute();
      return {
        disabledHours: () => Array.from({ length: 24 }, (_, i) => i).filter(h => h < currentHour),
        disabledMinutes: () => current.hour() === currentHour ? Array.from({ length: 60 }, (_, i) => i).filter(m => m < currentMinute) : [],
      };
    }
    return {};
  };

  const handleAction = async (id, action) => {
    try {
      await api.put(`/sewage-logs/${id}/${action}`);
      message.success(`Đã ${action === 'approve' ? 'phê duyệt' : 'từ chối'} yêu cầu.`);
      fetchLogs();
    } catch (error) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra.');
    }
  };

  const columns = [
    {
      title: 'Thời gian dự kiến',
      dataIndex: 'plannedDischargeDate',
      key: 'plannedDischargeDate',
      render: (text) => dayjs(text).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Vị trí',
      dataIndex: 'startPosition',
      key: 'startPosition',
    },
    {
      title: 'Loại',
      dataIndex: 'dischargeType',
      key: 'dischargeType',
      render: (type) => {
        const types = {
          'Treated_STP': { color: 'green', text: 'Đã xử lý (STP)' },
          'Comminuted': { color: 'orange', text: 'Nghiền/Khử trùng' },
          'Untreated': { color: 'red', text: 'Chưa xử lý' }
        };
        const config = types[type] || { color: 'default', text: type };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'Khối lượng (m³)',
      dataIndex: 'volume',
      key: 'volume',
    },
    {
      title: 'Khoảng cách bờ (nm)',
      dataIndex: 'distanceFromLand',
      key: 'distanceFromLand',
    },
    {
      title: 'Tốc độ tàu (knots)',
      dataIndex: 'shipSpeed',
      key: 'shipSpeed',
    },
    {
      title: 'Đính kèm',
      key: 'images',
      render: (_, record) => {
        if (!record.images || record.images.length === 0) return '-';
        return (
          <Image.PreviewGroup>
            {record.images.map((img, i) => (
              <Image 
                key={i} 
                src={`http://localhost:5000${img}`} 
                width={32} 
                height={32} 
                style={{ objectFit: 'cover', display: i === 0 ? 'inline-block' : 'none' }}
                preview={{ src: `http://localhost:5000${img}` }}
              />
            ))}
            {record.images.length > 1 && <Text style={{ marginLeft: 8 }} type="secondary">+{record.images.length - 1}</Text>}
          </Image.PreviewGroup>
        );
      }
    },
    {
      title: 'Người yêu cầu',
      dataIndex: 'Requester',
      key: 'Requester',
      render: (req) => req?.username || '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const color = status === 'Approved' ? 'green' : status === 'Rejected' ? 'red' : 'gold';
        return <Tag color={color}>{status}</Tag>;
      }
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => {
        if (record.status === 'Pending' && isMaster) {
          return (
            <Space>
              <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleAction(record.id, 'approve')}>Duyệt</Button>
              <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleAction(record.id, 'reject')}>Từ chối</Button>
            </Space>
          );
        }
        return record.Approver ? <Text type="secondary">Bởi: {record.Approver.username}</Text> : null;
      },
    },
  ];

  if (!activeVoyageId) {
    return (
      <MasterLayout>
        <div style={{ padding: 24 }}>
          <Alert message="Lỗi" description="Chưa có chuyến đi nào được chọn. Vui lòng chọn chuyến đi trước." type="error" />
        </div>
      </MasterLayout>
    );
  }

  return (
    <MasterLayout>
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
          <div>
          <Title level={3} style={{ margin: 0 }}>Sổ Nhật ký Xả thải (MARPOL Annex IV)</Title>
          <Text type="secondary">Quản lý và phê duyệt các hoạt động xả nước thải trên tàu</Text>
        </div>
        {isChief && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
            Tạo yêu cầu xả thải
          </Button>
        )}
      </div>

      <Card>
        <Table
          dataSource={logs}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title="Tạo Yêu Cầu Xả Thải MARPOL"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateRequest}
          initialValues={{ dischargeType: 'Treated_STP' }}
        >
          <Alert 
            message="Quy định MARPOL Annex IV" 
            description="Đảm bảo cập nhật chính xác tốc độ tàu và khoảng cách bờ. Bơm xả sẽ không được duyệt nếu vi phạm luật." 
            type="info" 
            showIcon 
            style={{ marginBottom: 16 }} 
          />

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="dischargeType" label="Loại nước thải" style={{ flex: 1 }} rules={[{ required: true }]}>
              <Select>
                <Option value="Treated_STP">Đã qua hệ thống xử lý (STP)</Option>
                <Option value="Comminuted">Nước thải đã nghiền và khử trùng</Option>
                <Option value="Untreated">Nước thải chưa xử lý</Option>
              </Select>
            </Form.Item>
            
            <Form.Item name="plannedDischargeDate" label="Ngày giờ dự kiến" style={{ flex: 1 }} rules={[{ required: true, message: 'Vui lòng chọn ngày giờ' }]}>
              <DatePicker 
                showTime 
                format="DD/MM/YYYY HH:mm" 
                style={{ width: '100%' }} 
                disabledDate={disabledDate}
                disabledTime={disabledTime}
              />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item 
              name="distanceFromLand" 
              label="Khoảng cách tới bờ (nm)" 
              style={{ flex: 1 }}
              rules={[
                { required: true, message: 'Vui lòng nhập' },
                {
                  validator: async (_, value) => {
                    if (dischargeType === 'Untreated' && value < 12) {
                      return Promise.reject(new Error('Nước chưa xử lý phải cách bờ >= 12 nm'));
                    }
                    if (dischargeType === 'Comminuted' && value < 3) {
                      return Promise.reject(new Error('Nước đã nghiền phải cách bờ >= 3 nm'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
              dependencies={['dischargeType']}
            >
              <InputNumber min={0} step={0.1} style={{ width: '100%' }} placeholder="Ví dụ: 15.5" />
            </Form.Item>
            
            <Form.Item 
              name="shipSpeed" 
              label="Tốc độ tàu (knots)" 
              style={{ flex: 1 }}
              rules={[
                { required: true, message: 'Vui lòng nhập' },
                {
                  validator: async (_, value) => {
                    if ((dischargeType === 'Untreated' || dischargeType === 'Comminuted') && value < 4) {
                      return Promise.reject(new Error('Tốc độ phải >= 4 knots'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
              dependencies={['dischargeType']}
            >
              <InputNumber min={0} step={0.1} style={{ width: '100%' }} placeholder="Ví dụ: 12.0" />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
             <Form.Item name="latitude" label="Vĩ độ" style={{ flex: 1 }} rules={[{ required: true, message: 'Nhập Vĩ độ' }]}>
              <Input placeholder="Vd: 10°45'N" />
            </Form.Item>

             <Form.Item name="longitude" label="Kinh độ" style={{ flex: 1 }} rules={[{ required: true, message: 'Nhập Kinh độ' }]}>
              <Input placeholder="Vd: 106°40'E" />
            </Form.Item>

            <Form.Item name="volume" label="Khối lượng (m³)" style={{ flex: 1 }} rules={[{ required: true, message: 'Vui lòng nhập khối lượng' }]}>
              <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item name="remarks" label="Ghi chú thêm">
            <Input.TextArea rows={2} placeholder="Các ghi chú hoặc tình trạng thiết bị (nếu có)" />
          </Form.Item>

          <Form.Item label="Hình ảnh đính kèm (Tối đa 5 ảnh)">
            <Upload
              listType="picture-card"
              fileList={fileList}
              onChange={handleUploadChange}
              beforeUpload={() => false} // Prevent automatic upload
              accept="image/*"
              maxCount={5}
            >
              {fileList.length >= 5 ? null : (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>Tải ảnh</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setIsModalVisible(false)} style={{ marginRight: 8 }}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>Gửi yêu cầu phê duyệt</Button>
          </Form.Item>
        </Form>
      </Modal>
      </div>
    </MasterLayout>
  );
}
