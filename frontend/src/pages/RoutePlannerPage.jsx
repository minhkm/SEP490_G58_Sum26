import React, { useState, useEffect } from 'react';
import { Typography, Card, Button, Select, Spin, message, Row, Col, Tag, Space } from 'antd';
import { SaveOutlined, DeleteOutlined, UndoOutlined, SendOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
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
function LocationMarkers({ waypoints, setWaypoints }) {
  useMapEvents({
    click(e) {
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

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userRole = (user.role || '').replace(/\s+/g, '').toLowerCase();

  useEffect(() => {
    fetchVoyages();
  }, []);

  const fetchVoyages = async () => {
    try {
      const data = await voyageService.getAll();
      setVoyages(data || []);
      // Auto select first loaded/underway voyage
      const activeVoyages = (data || []).filter(v => v.status === 'Loaded' || v.status === 'Underway');
      if (activeVoyages.length > 0) {
        handleSelectVoyage(activeVoyages[0].id, data);
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

  const handleSave = async () => {
    if (!selectedVoyageId) return message.warning('Vui lòng chọn chuyến đi');
    try {
      setSaving(true);
      await voyageService.updateVoyage(selectedVoyageId, { routeWaypoints: waypoints });
      message.success('Đã lưu lộ trình thành công!');
      fetchVoyages();
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi lưu lộ trình');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedVoyageId) return message.warning('Vui lòng chọn chuyến đi');
    try {
      setSaving(true);
      await voyageService.updateVoyage(selectedVoyageId, { routeWaypoints: waypoints, routeStatus: 'Pending' });
      message.success('Đã gửi Thuyền trưởng duyệt!');
      fetchVoyages();
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi gửi duyệt');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedVoyageId) return message.warning('Vui lòng chọn chuyến đi');
    try {
      setSaving(true);
      await voyageService.updateVoyage(selectedVoyageId, { routeStatus: 'Approved' });
      message.success('Đã phê duyệt lộ trình!');
      fetchVoyages();
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi phê duyệt lộ trình');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedVoyageId) return message.warning('Vui lòng chọn chuyến đi');
    try {
      setSaving(true);
      await voyageService.updateVoyage(selectedVoyageId, { routeStatus: 'Draft' });
      message.success('Đã từ chối lộ trình, trả về trạng thái Nháp!');
      fetchVoyages();
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi từ chối lộ trình');
    } finally {
      setSaving(false);
    }
  };

  const selectedVoyage = voyages.find(v => v.id === selectedVoyageId);

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
                <Button icon={<UndoOutlined />} onClick={handleUndo} disabled={waypoints.length === 0 || selectedVoyage?.routeStatus === 'Approved'}>
                  Hoàn tác điểm cuối
                </Button>
                <Button danger icon={<DeleteOutlined />} onClick={handleClear} disabled={waypoints.length === 0 || selectedVoyage?.routeStatus === 'Approved'}>
                  Xoá lộ trình
                </Button>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} disabled={!selectedVoyage || selectedVoyage?.routeStatus === 'Approved'}>
                  Lưu lộ trình
                </Button>
                {userRole === 'chiefofficer' && (!selectedVoyage?.routeStatus || selectedVoyage?.routeStatus === 'Draft') && (
                  <Button type="primary" icon={<SendOutlined />} onClick={handleSubmitReview} loading={saving} disabled={!selectedVoyage || waypoints.length === 0} style={{ background: '#f59e0b', borderColor: '#f59e0b' }}>
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
              <LocationMarkers waypoints={waypoints} setWaypoints={setWaypoints} />
            </MapContainer>
          )}
        </Card>
      </div>
    </MasterLayout>
  );
}
