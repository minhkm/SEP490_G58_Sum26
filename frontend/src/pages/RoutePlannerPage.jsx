import React, { useState, useEffect } from 'react';
import { Typography, Card, Button, Select, Spin, message, Row, Col, Tag, Space, Input } from 'antd';
import { SaveOutlined, DeleteOutlined, UndoOutlined, SendOutlined, CheckOutlined, CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { voyageService } from '../services/api';
import MasterLayout from '../components/MasterLayout';

import { SEAPORTS } from '../data/ports';

// Fix leaflet icon issue in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const { Title, Text } = Typography;

// Component to handle map clicks
function LocationMarkers({ waypoints, setWaypoints, isReadOnly }) {
  useMapEvents({
    click(e) {
      if (isReadOnly) return;
      setWaypoints((prev) => {
        if (prev.length >= 2) {
          const newPts = [...prev];
          newPts.splice(newPts.length - 1, 0, { lat: e.latlng.lat, lng: e.latlng.lng });
          return newPts;
        }
        return [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }];
      });
    },
  });

  return (
    <>
      {waypoints.map((pos, idx) => (
        <Marker key={idx} position={[pos.lat, pos.lng]} />
      ))}
      {waypoints.length > 1 && (
        <Polyline positions={waypoints.map(p => [p.lat, p.lng])} color="blue" weight={3} />
      )}
    </>
  );
}

export default function RoutePlannerPage() {
  const [voyages, setVoyages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVoyageId, setSelectedVoyageId] = useState(null);
  const [waypoints, setWaypoints] = useState([]);
  const [saving, setSaving] = useState(false);
  const [inputLat, setInputLat] = useState('');
  const [inputLng, setInputLng] = useState('');

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const activeVoyageRole = localStorage.getItem('activeVoyageRole');
  const userRole = (activeVoyageRole || user.role || '').replace(/\s+/g, '').toLowerCase();

  useEffect(() => {
    fetchVoyages();
  }, []);

  const fetchVoyages = async () => {
    try {
      const data = await voyageService.getAll();
      const activeData = (data || []).filter(v => v.status !== 'Completed' && v.status !== 'Cancelled');
      setVoyages(activeData);
      // Auto select first loaded/underway voyage
      const activeVoyages = activeData.filter(v => v.status === 'Loaded' || v.status === 'Underway');
      if (activeVoyages.length > 0) {
        handleSelectVoyage(activeVoyages[0].id, activeData);
      }
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách chuyến đi');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVoyage = (id, data = voyages) => {
    setSelectedVoyageId(id);
    const voyage = data.find(v => v.id === id);
    if (voyage && voyage.routeWaypoints && voyage.routeWaypoints.length > 0) {
      setWaypoints(voyage.routeWaypoints);
    } else if (voyage) {
      const depPort = SEAPORTS.find(p => p.value === voyage.departurePort);
      const arrPort = SEAPORTS.find(p => p.value === voyage.destinationPort);
      const newWaypoints = [];
      if (depPort && depPort.lat && depPort.lng) {
        newWaypoints.push({ lat: depPort.lat, lng: depPort.lng });
      }
      if (arrPort && arrPort.lat && arrPort.lng) {
        newWaypoints.push({ lat: arrPort.lat, lng: arrPort.lng });
      }
      setWaypoints(newWaypoints);
    } else {
      setWaypoints([]);
    }
  };

  const handleUndo = () => {
    setWaypoints((prev) => {
      if (prev.length > 2) {
        const newPts = [...prev];
        newPts.splice(newPts.length - 2, 1);
        return newPts;
      }
      return prev;
    });
  };

  const handleClear = () => {
    setWaypoints((prev) => {
      if (prev.length >= 2) return [prev[0], prev[prev.length - 1]];
      return [];
    });
  };

  const handleAddWaypoint = () => {
    const lat = parseFloat(inputLat);
    const lng = parseFloat(inputLng);
    if (isNaN(lat) || isNaN(lng)) {
      return message.error('Vui lòng nhập toạ độ hợp lệ (số thực)');
    }
    if (lat < -90 || lat > 90) {
      return message.error('Vĩ độ (Latitude) phải từ -90 đến 90');
    }
    if (lng < -180 || lng > 180) {
      return message.error('Kinh độ (Longitude) phải từ -180 đến 180');
    }
    
    setWaypoints((prev) => {
      if (prev.length >= 2) {
        const newPts = [...prev];
        newPts.splice(newPts.length - 1, 0, { lat, lng });
        return newPts;
      }
      return [...prev, { lat, lng }];
    });
    setInputLat('');
    setInputLng('');
  };

  const handleSave = async () => {
    if (!selectedVoyageId) return message.warning('Vui lòng chọn chuyến đi');
    try {
      setSaving(true);
      await voyageService.updateVoyage(selectedVoyageId, { routeWaypoints: waypoints, userRole });
      message.success('Đã lưu lộ trình thành công!');
      fetchVoyages();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Lỗi khi lưu lộ trình');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedVoyageId) return message.warning('Vui lòng chọn chuyến đi');
    try {
      setSaving(true);
      await voyageService.updateVoyage(selectedVoyageId, { routeWaypoints: waypoints, routeStatus: 'Pending', userRole });
      message.success('Đã gửi Thuyền trưởng duyệt!');
      fetchVoyages();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Lỗi khi gửi duyệt');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedVoyageId) return message.warning('Vui lòng chọn chuyến đi');
    try {
      setSaving(true);
      await voyageService.updateVoyage(selectedVoyageId, { routeStatus: 'Approved', userRole });
      message.success('Đã phê duyệt lộ trình!');
      fetchVoyages();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Lỗi khi phê duyệt');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedVoyageId) return message.warning('Vui lòng chọn chuyến đi');
    try {
      setSaving(true);
      await voyageService.updateVoyage(selectedVoyageId, { routeStatus: 'Draft', userRole });
      message.success('Đã từ chối lộ trình, trả về trạng thái Nháp!');
      fetchVoyages();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Lỗi khi từ chối');
    } finally {
      setSaving(false);
    }
  };

  const selectedVoyage = voyages.find(v => v.id === selectedVoyageId);

  let isReadOnly = !selectedVoyage || 
                     ['Approved', 'Pending'].includes(selectedVoyage.routeStatus) || 
                     ['Underway', 'Arrived', 'Completed', 'Discharge', 'Discharged', 'Homeward Bounding'].includes(selectedVoyage.status);

  if (userRole === 'chiefofficer' && selectedVoyage && selectedVoyage.status !== 'Loaded') {
    isReadOnly = true;
  }

  if (userRole === 'master') {
    isReadOnly = true;
  }

  return (
    <MasterLayout>
      <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={3} style={{ margin: 0 }}>Thiết lập lộ trình hải trình</Title>
            <Text type="secondary">Vẽ lộ trình di chuyển trên biển bằng cách click vào bản đồ để tạo các điểm Waypoints</Text>
          </Col>
        </Row>

        <Card bordered={false} style={{ marginBottom: 24, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <Row gutter={16} align="middle">
            <Col span={8}>
              <Text strong>Chọn chuyến đi:</Text>
              <Select
                style={{ width: '100%', marginTop: 8 }}
                placeholder="Chọn chuyến đi"
                value={selectedVoyageId}
                onChange={(val) => handleSelectVoyage(val)}
                loading={loading}
              >
                {voyages.map(v => (
                  <Select.Option key={v.id} value={v.id}>
                    VY-{String(v.id).padStart(4, '0')} - {v.departurePort} đến {v.destinationPort} ({v.status})
                    {v.routeStatus === 'Pending' && <Tag color="warning" style={{ marginLeft: 8 }}>Chờ duyệt</Tag>}
                    {v.routeStatus === 'Approved' && <Tag color="success" style={{ marginLeft: 8 }}>Đã duyệt</Tag>}
                    {(!v.routeStatus || v.routeStatus === 'Draft') && <Tag color="default" style={{ marginLeft: 8 }}>Nháp</Tag>}
                  </Select.Option>
                ))}
              </Select>
            </Col>
            <Col span={16} style={{ textAlign: 'right', marginTop: 28 }}>
              <Space>
                {userRole !== 'master' && (
                  <>
                    <Button icon={<UndoOutlined />} onClick={handleUndo} disabled={waypoints.length === 0 || isReadOnly}>
                      Hoàn tác điểm cuối
                    </Button>
                    <Button danger icon={<DeleteOutlined />} onClick={handleClear} disabled={waypoints.length === 0 || isReadOnly}>
                      Xoá lộ trình
                    </Button>
                    <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} disabled={isReadOnly}>
                      Lưu lộ trình
                    </Button>
                  </>
                )}
                {userRole === 'chiefofficer' && (!selectedVoyage?.routeStatus || selectedVoyage?.routeStatus === 'Draft') && (
                  <Button type="primary" icon={<SendOutlined />} onClick={handleSubmitReview} loading={saving} disabled={isReadOnly || waypoints.length === 0} style={{ background: '#f59e0b', borderColor: '#f59e0b' }}>
                    Gửi duyệt
                  </Button>
                )}
                {userRole === 'master' && selectedVoyage?.routeStatus === 'Pending' && (
                  <>
                    <Button type="primary" icon={<CheckOutlined />} onClick={handleApprove} loading={saving} style={{ background: '#10b981', borderColor: '#10b981' }}>
                      Phê duyệt
                    </Button>
                    <Button danger icon={<CloseOutlined />} onClick={handleReject} loading={saving}>
                      Từ chối
                    </Button>
                  </>
                )}
              </Space>
            </Col>
          </Row>
          
          {userRole !== 'master' && (
            <Row gutter={16} align="middle" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
              <Col span={24}>
                <Space>
                  <Text strong>Thêm toạ độ thủ công:</Text>
                  <Input 
                    placeholder="Vĩ độ (Latitude) VD: 16.04" 
                    value={inputLat} 
                    onChange={e => setInputLat(e.target.value)} 
                    style={{ width: 200 }} 
                    disabled={isReadOnly || !selectedVoyageId} 
                  />
                  <Input 
                    placeholder="Kinh độ (Longitude) VD: 108.20" 
                    value={inputLng} 
                    onChange={e => setInputLng(e.target.value)} 
                    style={{ width: 200 }} 
                    disabled={isReadOnly || !selectedVoyageId} 
                  />
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={handleAddWaypoint} 
                    disabled={isReadOnly || !inputLat || !inputLng}
                    style={{ background: '#3b82f6', borderColor: '#3b82f6' }}
                  >
                    Thêm điểm
                  </Button>
                </Space>
              </Col>
            </Row>
          )}
        </Card>

        <Card 
          bordered={false} 
          bodyStyle={{ padding: 0, height: '100%' }}
          style={{ borderRadius: 12, overflow: 'hidden', height: '65vh', minHeight: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        >
          {loading ? (
            <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
              <Spin size="large" />
            </div>
          ) : (
            <MapContainer 
              center={[16.047079, 108.206230]} // Default to Da Nang, Vietnam
              zoom={5} 
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationMarkers waypoints={waypoints} setWaypoints={setWaypoints} isReadOnly={isReadOnly} />
            </MapContainer>
          )}
        </Card>
      </div>
    </MasterLayout>
  );
}
