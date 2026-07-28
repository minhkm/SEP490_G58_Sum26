import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, InputNumber, Select, Input, Tag, message, Space, Card, Typography, Alert, DatePicker, Upload, Image, Row, Col, Statistic } from 'antd';
import MasterLayout from '../components/MasterLayout';
import { PlusOutlined, CheckCircleOutlined, CloseCircleOutlined, EnvironmentOutlined, WarningOutlined } from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';

import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function LocationMapPicker({ setLat, setLng }) {
  useMapEvents({
    click(e) {
      setLat(e.latlng.lat);
      setLng(e.latlng.lng);
    },
  });
  return null;
}

function MapUpdater({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

const { Title, Text } = Typography;
const { Option } = Select;

export default function SewageLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [form] = Form.useForm();
  
  // Map state
  const [selectedLat, setSelectedLat] = useState(16.0);
  const [selectedLng, setSelectedLng] = useState(108.0);
  const [viewMapVisible, setViewMapVisible] = useState(false);
  const [viewMapLocation, setViewMapLocation] = useState(null);

  // PIN state
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const activeVoyageRole = localStorage.getItem('activeVoyageRole') || user.role;
  const activeVoyageId = localStorage.getItem('activeVoyageId');

  const isChief = activeVoyageRole === 'ChiefOfficer' || user.role === 'Admin';
  const isMaster = activeVoyageRole === 'Master' || user.role === 'Admin';

  const dischargeType = Form.useWatch('dischargeType', form);
  const distanceFromLand = Form.useWatch('distanceFromLand', form);
  const shipSpeed = Form.useWatch('shipSpeed', form);

  let isCompliant = true;
  let complianceMessage = '';
  let marpolRuleDesc = 'Hệ thống sẽ ghi nhận vi phạm nếu không đáp ứng đúng chuẩn khoảng cách và tốc độ.';
  
  if (dischargeType === 'Untreated') {
    marpolRuleDesc = 'Luật MARPOL: Nước thải chưa xử lý yêu cầu khoảng cách tới bờ tối thiểu 12 hải lý và tốc độ tàu tối thiểu 4 knots.';
    if ((distanceFromLand !== undefined && distanceFromLand < 12) || (shipSpeed !== undefined && shipSpeed < 4)) {
      isCompliant = false;
      complianceMessage = 'Nước thải chưa xử lý phải cách bờ >= 12 nm và tốc độ >= 4 knots.';
    }
  } else if (dischargeType === 'Comminuted') {
    marpolRuleDesc = 'Luật MARPOL: Nước thải đã nghiền và khử trùng yêu cầu khoảng cách tới bờ tối thiểu 3 hải lý và tốc độ tàu tối thiểu 4 knots.';
    if ((distanceFromLand !== undefined && distanceFromLand < 3) || (shipSpeed !== undefined && shipSpeed < 4)) {
      isCompliant = false;
      complianceMessage = 'Nước thải đã nghiền/khử trùng phải cách bờ >= 3 nm và tốc độ >= 4 knots.';
    }
  } else if (dischargeType === 'Treated_STP') {
    marpolRuleDesc = 'Luật MARPOL: Nước thải đã qua hệ thống xử lý (STP) không quy định giới hạn khoảng cách và tốc độ khi xả.';
  }

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVoyageId]);

  const handleGetCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setSelectedLat(position.coords.latitude);
          setSelectedLng(position.coords.longitude);
          message.success('Đã lấy vị trí GPS hiện tại!');
        },
        (error) => {
          console.error(error);
          message.error('Không thể lấy vị trí. Vui lòng kiểm tra quyền truy cập vị trí của trình duyệt.');
        },
        { enableHighAccuracy: true }
      );
    } else {
      message.error('Trình duyệt của bạn không hỗ trợ lấy vị trí GPS.');
    }
  };

  const handleCreateRequest = async (values) => {
    setSubmitting(true);
    try {
      const payloadData = {
        ...values,
        startLat: selectedLat,
        startLng: selectedLng,
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
    return current && current < dayjs().startOf('day');
  };

  const disabledTime = (current) => {
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

  const handleAction = (id, action) => {
    if (action === 'approve') {
      setPendingAction({ id, action });
      setPinModalVisible(true);
    } else {
      executeAction(id, action);
    }
  };

  const executeAction = async (id, action) => {
    try {
      await api.put(`/sewage-logs/${id}/${action}`);
      message.success(`Đã ${action === 'approve' ? 'phê duyệt' : 'từ chối'} yêu cầu.`);
      fetchLogs();
    } catch (error) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra.');
    }
  };

  const handlePinConfirm = () => {
    if (pinCode === '123456') {
      setPinModalVisible(false);
      setPinCode('');
      executeAction(pendingAction.id, pendingAction.action);
    } else {
      message.error('Mã PIN không đúng (dùng 123456 để test).');
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
      key: 'position',
      render: (_, record) => (
        <Button 
          type="link" 
          icon={<EnvironmentOutlined />} 
          disabled={record.startLat == null || record.startLng == null}
          onClick={() => {
            setViewMapLocation({ lat: record.startLat, lng: record.startLng });
            setViewMapVisible(true);
          }}
        >
          Xem bản đồ
        </Button>
      )
    },
    {
      title: 'Tuân thủ',
      dataIndex: 'isCompliant',
      key: 'isCompliant',
      render: (isCompliant) => (
        isCompliant ? <Tag color="green">Đúng quy định</Tag> : <Tag color="red">Vi phạm MARPOL</Tag>
      )
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

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card>
              <Statistic title="Tổng lượng xả thải (m³)" value={logs.filter(l => l.status === 'Approved').reduce((acc, l) => acc + l.volume, 0).toFixed(1)} />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic title="Yêu cầu chờ duyệt" value={logs.filter(l => l.status === 'Pending').length} valueStyle={{ color: '#faad14' }} />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic title="Số lần vi phạm MARPOL" value={logs.filter(l => l.isCompliant === false).length} valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
        </Row>

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
              description={marpolRuleDesc} 
              type="info" 
              showIcon 
              style={{ marginBottom: 16 }} 
            />

            {!isCompliant && (
              <Alert 
                message="CẢNH BÁO VI PHẠM MARPOL" 
                description={complianceMessage} 
                type="error" 
                showIcon 
                icon={<WarningOutlined />}
                style={{ marginBottom: 16, backgroundColor: '#fff2f0', border: '1px solid #ffccc7' }} 
              />
            )}

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
                rules={[{ required: true, message: 'Vui lòng nhập' }]}
              >
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} placeholder="Ví dụ: 15.5" />
              </Form.Item>
              
              <Form.Item 
                name="shipSpeed" 
                label="Tốc độ tàu (knots)" 
                style={{ flex: 1 }}
                rules={[{ required: true, message: 'Vui lòng nhập' }]}
              >
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} placeholder="Ví dụ: 12.0" />
              </Form.Item>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>Chọn vị trí xả thải (Click trên bản đồ hoặc nhập tay)</Text>
              
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <Form.Item label="Vĩ độ (Latitude)" style={{ flex: 1, marginBottom: 0 }}>
                  <InputNumber 
                    value={selectedLat} 
                    onChange={(val) => setSelectedLat(val || 0)} 
                    style={{ width: '100%' }} 
                    step={0.0001}
                  />
                </Form.Item>
                <Form.Item label="Kinh độ (Longitude)" style={{ flex: 1, marginBottom: 0 }}>
                  <InputNumber 
                    value={selectedLng} 
                    onChange={(val) => setSelectedLng(val || 0)} 
                    style={{ width: '100%' }} 
                    step={0.0001}
                  />
                </Form.Item>
                <Button 
                  type="default" 
                  icon={<EnvironmentOutlined />} 
                  onClick={handleGetCurrentLocation}
                  style={{ alignSelf: 'flex-end' }}
                >
                  Lấy GPS
                </Button>
              </div>

              <div style={{ height: 250, width: '100%', marginTop: 16, marginBottom: 8, border: '1px solid #d9d9d9', borderRadius: 6, overflow: 'hidden' }}>
                <MapContainer center={[16.0, 108.0]} zoom={5} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationMapPicker setLat={setSelectedLat} setLng={setSelectedLng} />
                  <MapUpdater lat={selectedLat} lng={selectedLng} />
                  <Marker position={[selectedLat, selectedLng]}>
                    <Popup>Vị trí chọn: {selectedLat.toFixed(4)}, {selectedLng.toFixed(4)}</Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
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

        <Modal
          title="Bản đồ Vị trí Xả thải"
          open={viewMapVisible}
          onCancel={() => setViewMapVisible(false)}
          footer={[
            <Button key="close" onClick={() => setViewMapVisible(false)}>Đóng</Button>
          ]}
          width={600}
        >
          {viewMapLocation && (
            <div style={{ height: 400, width: '100%', borderRadius: 6, overflow: 'hidden' }}>
              <MapContainer center={[viewMapLocation.lat, viewMapLocation.lng]} zoom={8} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[viewMapLocation.lat, viewMapLocation.lng]}>
                  <Popup>Vị trí xả thải: {viewMapLocation.lat}, {viewMapLocation.lng}</Popup>
                </Marker>
              </MapContainer>
            </div>
          )}
        </Modal>

        <Modal
          title="Xác thực Chữ ký số (E-Signature)"
          open={pinModalVisible}
          onCancel={() => {
            setPinModalVisible(false);
            setPinCode('');
          }}
          onOk={handlePinConfirm}
          okText="Xác nhận Duyệt"
          cancelText="Hủy"
        >
          <p>Vui lòng nhập Mã PIN Thuyền trưởng để duyệt yêu cầu này.</p>
          <Input.Password 
            placeholder="Nhập mã PIN (123456)" 
            value={pinCode} 
            onChange={(e) => setPinCode(e.target.value)} 
            style={{ width: '100%', marginTop: 10 }}
          />
        </Modal>

      </div>
    </MasterLayout>
  );
}
