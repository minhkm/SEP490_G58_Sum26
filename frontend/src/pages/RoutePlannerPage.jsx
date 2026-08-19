import { useState, useEffect, useMemo } from 'react';
import {
  Typography,
  Card,
  Button,
  Select,
  Spin,
  message,
  Row,
  Col,
  Tag,
  Space,
  Input,
  Alert,
  Switch,
} from 'antd';
import {
  SaveOutlined,
  DeleteOutlined,
  UndoOutlined,
  SendOutlined,
  CheckOutlined,
  CloseOutlined,
  PlusOutlined,
  CompassOutlined,
  ThunderboltOutlined,
  EnvironmentOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { MapContainer, TileLayer, Marker, Polyline, Popup, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { voyageService, portService } from '../services/api';
import MasterLayout from '../components/MasterLayout';
import { translateStatus } from '../components/common/StatusTag';
import {
  generateSafeMaritimeRoute,
  validateRouteSafety,
  calculateDistanceNM,
  isWaterCoordinate,
  MARITIME_NODES,
} from '../utils/maritimeRouting';

// Fix leaflet icon issue in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const { Title, Text } = Typography;

function LocationMarkers({ waypoints, setWaypoints, isReadOnly, unsafeSegments, showMaritimeHubs }) {
  useMapEvents({
    click(e) {
      if (isReadOnly) return;
      const lat = parseFloat(e.latlng.lat.toFixed(4));
      const lng = parseFloat(e.latlng.lng.toFixed(4));

      // Kiểm tra tọa độ trên biển hay đất liền ngay lập tức
      const isWater = isWaterCoordinate(lat, lng);
      if (!isWater) {
        message.warning('Không thể đặt điểm trên đất liền! Vui lòng click vào vùng biển.');
        return;
      }

      setWaypoints((prev) => {
        if (prev.length >= 2) {
          // Chèn điểm mới vào ngay trước cảng đích (điểm cuối cùng)
          const newPts = [...prev];
          newPts.splice(newPts.length - 1, 0, { lat, lng, name: `Điểm mốc #${newPts.length}` });
          return newPts;
        }
        return [...prev, { lat, lng, name: `Điểm mốc #${prev.length + 1}` }];
      });
      message.success(`Đã thêm điểm mốc: [${lat}, ${lng}]`);
    },
  });

  const handleDeleteWaypoint = (index) => {
    if (isReadOnly) return;
    if (index === 0 || index === waypoints.length - 1) {
      message.error('Không thể xóa điểm cảng xuất phát hoặc cảng đích!');
      return;
    }
    setWaypoints((prev) => prev.filter((_, idx) => idx !== index));
    message.info('Đã xóa điểm mốc khỏi lộ trình');
  };

  const handleDragEnd = (index, e) => {
    if (isReadOnly) return;
    if (index === 0 || index === waypoints.length - 1) {
      message.error('Không thể di chuyển điểm cảng xuất phát hoặc cảng đích!');
      setWaypoints([...waypoints]);
      return;
    }
    const newLat = parseFloat(e.target.getLatLng().lat.toFixed(4));
    const newLng = parseFloat(e.target.getLatLng().lng.toFixed(4));
    setWaypoints((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], lat: newLat, lng: newLng };
      return updated;
    });
  };

  return (
    <>
      {/* Hiển thị các điểm mốc luồng hàng hải tiêu chuẩn nếu bật toggle */}
      {showMaritimeHubs &&
        Object.values(MARITIME_NODES).map((hub) => (
          <CircleMarker
            key={hub.id}
            center={[hub.lat, hub.lng]}
            radius={6}
            pathOptions={{ color: '#0284c7', fillColor: '#38bdf8', fillOpacity: 0.8 }}
          >
            <Popup>
              <div style={{ fontSize: 13, fontWeight: 600 }}>🌊 Mốc Luồng: {hub.name}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Tọa độ: {hub.lat}, {hub.lng}
              </div>
              {!isReadOnly && (
                <Button
                  size="small"
                  type="primary"
                  style={{ marginTop: 6, fontSize: 11 }}
                  onClick={() => {
                    setWaypoints((prev) => {
                      if (prev.length >= 2) {
                        const newPts = [...prev];
                        newPts.splice(newPts.length - 1, 0, { lat: hub.lat, lng: hub.lng, name: hub.name });
                        return newPts;
                      }
                      return [...prev, { lat: hub.lat, lng: hub.lng, name: hub.name }];
                    });
                    message.success(`Đã thêm mốc: ${hub.name}`);
                  }}
                >
                  + Chèn vào Lộ trình
                </Button>
              )}
            </Popup>
          </CircleMarker>
        ))}

      {/* Render từng điểm Waypoint trên lộ trình */}
      {waypoints.map((pos, idx) => {
        const isStart = idx === 0;
        const isEnd = idx === waypoints.length - 1 && waypoints.length > 1;
        const label = isStart ? '🚩 Cảng Xuất Phát' : isEnd ? '🏁 Cảng Đích' : `Điểm Chuyển Hướng #${idx}`;

        return (
          <Marker
            key={`wp-${idx}-${pos.lat}-${pos.lng}`}
            position={[pos.lat, pos.lng]}
            draggable={!isReadOnly}
            eventHandlers={{
              dragend: (e) => handleDragEnd(idx, e),
            }}
          >
            <Popup>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{pos.name || label}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                Vĩ độ: {pos.lat.toFixed(4)} | Kinh độ: {pos.lng.toFixed(4)}
              </div>
              {!isReadOnly && (
                <div style={{ marginTop: 8 }}>
                  <Button
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    style={{ fontSize: 11 }}
                    onClick={() => handleDeleteWaypoint(idx)}
                  >
                    Xóa điểm này
                  </Button>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    (Mẹo: Bạn có thể kéo thả điểm này trên bản đồ)
                  </div>
                </div>
              )}
            </Popup>
          </Marker>
        );
      })}

      {/* Render từng đoạn nối giữa các điểm: Xanh nếu an toàn, Đỏ nét đứt nếu cắt qua đất liền */}
      {waypoints.length > 1 &&
        waypoints.slice(0, -1).map((p1, idx) => {
          const p2 = waypoints[idx + 1];
          const isUnsafe = unsafeSegments.includes(idx);

          return (
            <Polyline
              key={`seg-${idx}-${p1.lat}-${p1.lng}-${p2.lat}-${p2.lng}`}
              positions={[
                [p1.lat, p1.lng],
                [p2.lat, p2.lng],
              ]}
              pathOptions={{
                color: isUnsafe ? '#ef4444' : '#2563eb',
                weight: isUnsafe ? 4 : 4,
                dashArray: isUnsafe ? '8, 8' : undefined,
                opacity: 0.85,
              }}
            />
          );
        })}
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
  const [showMaritimeHubs, setShowMaritimeHubs] = useState(false);
  const [portList, setPortList] = useState([]);

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const activeVoyageRole = localStorage.getItem('activeVoyageRole');
  const userRole = (activeVoyageRole || user.role || '').replace(/\s+/g, '').toLowerCase();

  // Khởi tạo và nạp danh sách chuyến đi khi mở trang (CHỈ CHẠY 1 LẦN)
  useEffect(() => {
    let isMounted = true;
    Promise.all([voyageService.getAll(), portService.getAllPorts()])
      .then(([voyageData, portsRes]) => {
        if (!isMounted) return;
        
        let loadedPorts = [];
        if (portsRes && portsRes.success) {
           loadedPorts = portsRes.data.map(p => ({ value: p.portName, label: p.portName, lat: p.lat, lng: p.lng }));
           setPortList(loadedPorts);
        }

        const activeData = (voyageData || []).filter((v) => v.status !== 'Completed' && v.status !== 'Cancelled');
        setVoyages(activeData);
        if (activeData.length > 0) {
          const firstVoyage = activeData[0];
          setSelectedVoyageId(firstVoyage.id);
          if (firstVoyage.routeWaypoints && firstVoyage.routeWaypoints.length > 0) {
            setWaypoints(firstVoyage.routeWaypoints);
          } else {
            const depPort = loadedPorts.find((p) => p.value === firstVoyage.departurePort);
            const arrPort = loadedPorts.find((p) => p.value === firstVoyage.destinationPort);
            const initialWaypoints = [];
            if (depPort?.lat && depPort?.lng) {
              initialWaypoints.push({ lat: depPort.lat, lng: depPort.lng, name: `Cảng đi: ${depPort.label}` });
            }
            if (arrPort?.lat && arrPort?.lng) {
              initialWaypoints.push({ lat: arrPort.lat, lng: arrPort.lng, name: `Cảng đến: ${arrPort.label}` });
            }
            setWaypoints(initialWaypoints);
          }
        }
      })
      .catch((err) => {
        console.error(err);
        message.error('Không thể tải dữ liệu');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Khi người dùng đổi chuyến trong dropdown
  const handleSelectVoyage = (id) => {
    setSelectedVoyageId(id);
    const voyage = voyages.find((v) => v.id === id);
    if (voyage && voyage.routeWaypoints && voyage.routeWaypoints.length > 0) {
      setWaypoints(voyage.routeWaypoints);
    } else if (voyage) {
      const depPort = portList.find((p) => p.value === voyage.departurePort);
      const arrPort = portList.find((p) => p.value === voyage.destinationPort);
      const initialWaypoints = [];
      if (depPort?.lat && depPort?.lng) {
        initialWaypoints.push({ lat: depPort.lat, lng: depPort.lng, name: `Cảng đi: ${depPort.label}` });
      }
      if (arrPort?.lat && arrPort?.lng) {
        initialWaypoints.push({ lat: arrPort.lat, lng: arrPort.lng, name: `Cảng đến: ${arrPort.label}` });
      }
      setWaypoints(initialWaypoints);
    } else {
      setWaypoints([]);
    }
  };

  // Nạp lại danh sách voyages mà KHÔNG ghi đè waypoints đang vẽ
  const refreshVoyagesList = async () => {
    try {
      const data = await voyageService.getAll();
      const activeData = (data || []).filter((v) => v.status !== 'Completed' && v.status !== 'Cancelled');
      setVoyages(activeData);
    } catch (err) {
      console.error(err);
    }
  };

  // Kiểm tra an toàn luồng hải trình
  const routeSafety = useMemo(() => {
    return validateRouteSafety(waypoints);
  }, [waypoints]);

  // Tính tổng khoảng cách hải trình
  const totalDistanceNM = useMemo(() => {
    if (!waypoints || waypoints.length < 2) return 0;
    let dist = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      dist += calculateDistanceNM(
        waypoints[i].lat,
        waypoints[i].lng,
        waypoints[i + 1].lat,
        waypoints[i + 1].lng
      );
    }
    return Math.round(dist);
  }, [waypoints]);

  const selectedVoyage = voyages.find((v) => v.id === selectedVoyageId);

  // Khóa lộ trình đối với Master, và chỉ mở cho ChiefOfficer khi tàu đã "Loaded"
  const isReadOnly =
    !selectedVoyage ||
    userRole === 'master' ||
    (userRole === 'chiefofficer' && selectedVoyage.status !== 'Loaded') ||
    ['Approved', 'Pending'].includes(selectedVoyage.routeStatus) ||
    ['Completed', 'Cancelled'].includes(selectedVoyage.status);

  // Nút tự động sinh luồng hàng hải an toàn khi người dùng bấm
  const handleAutoGenerateRoute = () => {
    if (!selectedVoyage) return message.warning('Vui lòng chọn chuyến đi');
    const depPort = portList.find((p) => p.value === selectedVoyage.departurePort);
    const arrPort = portList.find((p) => p.value === selectedVoyage.destinationPort);

    if (!depPort?.lat || !arrPort?.lat) {
      return message.error('Không tìm thấy tọa độ cảng đi hoặc cảng đến.');
    }

    const safeRoute = generateSafeMaritimeRoute(
      { lat: depPort.lat, lng: depPort.lng, name: selectedVoyage.departurePort },
      { lat: arrPort.lat, lng: arrPort.lng, name: selectedVoyage.destinationPort }
    );

    if (!safeRoute) {
      return message.error('Không thể tìm thấy tuyến đường an toàn cho cặp cảng này. Vui lòng thử vẽ thủ công.');
    }

    setWaypoints(safeRoute);
    const checkSafety = validateRouteSafety(safeRoute);
    if (checkSafety.isSafe) {
      message.success('Đã tự động vẽ luồng hàng hải an toàn men theo biển!');
    } else {
      message.warning('Đã tự động vẽ tuyến, nhưng vẫn còn đoạn cắt qua đất liền. Vui lòng chỉnh sửa thủ công!');
    }
  };

  // Hoàn tác điểm vừa thêm
  const handleUndo = () => {
    setWaypoints((prev) => {
      if (prev.length <= 2) {
        message.info('Chỉ còn 2 điểm cảng xuất phát và cảng đích');
        return prev;
      }
      const newPts = [...prev];
      newPts.splice(newPts.length - 2, 1);
      return newPts;
    });
  };

  // Đặt lại về 2 điểm Cảng đi & Cảng đến
  const handleResetToPorts = () => {
    if (!selectedVoyage) return;
    const depPort = portList.find((p) => p.value === selectedVoyage.departurePort);
    const arrPort = portList.find((p) => p.value === selectedVoyage.destinationPort);
    const initialWaypoints = [];
    if (depPort?.lat && depPort?.lng) {
      initialWaypoints.push({ lat: depPort.lat, lng: depPort.lng, name: selectedVoyage.departurePort });
    }
    if (arrPort?.lat && arrPort?.lng) {
      initialWaypoints.push({ lat: arrPort.lat, lng: arrPort.lng, name: selectedVoyage.destinationPort });
    }
    setWaypoints(initialWaypoints);
    message.info('Đã xóa tất cả mốc trung gian, đưa về 2 cảng');
  };

  // Thêm tọa độ thủ công
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

    const isWater = isWaterCoordinate(lat, lng);
    if (!isWater) {
      return message.warning('Tọa độ này nằm trên đất liền! Vui lòng chọn tọa độ ngoài biển.');
    }

    setWaypoints((prev) => {
      if (prev.length >= 2) {
        const newPts = [...prev];
        newPts.splice(newPts.length - 1, 0, { lat, lng, name: `Tọa độ thủ công [${lat}, ${lng}]` });
        return newPts;
      }
      return [...prev, { lat, lng, name: `Tọa độ thủ công [${lat}, ${lng}]` }];
    });
    setInputLat('');
    setInputLng('');
    message.success(`Đã thêm điểm tọa độ [${lat}, ${lng}]`);
  };

  const handleSave = async () => {
    if (!selectedVoyageId) return message.warning('Vui lòng chọn chuyến đi');
    try {
      setSaving(true);
      await voyageService.updateVoyage(selectedVoyageId, { routeWaypoints: waypoints, userRole });
      message.success('Đã lưu lộ trình thành công!');
      refreshVoyagesList();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Lỗi khi lưu lộ trình');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedVoyageId) return message.warning('Vui lòng chọn chuyến đi');
    if (!routeSafety.isSafe) {
      return message.error('Lộ trình đang có đoạn cắt ngang qua đất liền! Vui lòng chỉnh sửa lại trước khi gửi duyệt.');
    }
    try {
      setSaving(true);
      await voyageService.updateVoyage(selectedVoyageId, {
        routeWaypoints: waypoints,
        routeStatus: 'Pending',
        userRole,
      });
      message.success('Đã gửi Thuyền trưởng duyệt!');
      refreshVoyagesList();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Lỗi khi gửi duyệt');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedVoyageId) return message.warning('Vui lòng chọn chuyến đi');
    if (!routeSafety.isSafe) {
      return message.error('Không thể phê duyệt lộ trình cắt ngang qua đất liền!');
    }
    try {
      setSaving(true);
      await voyageService.updateVoyage(selectedVoyageId, { routeStatus: 'Approved', userRole });
      message.success('Đã phê duyệt lộ trình!');
      refreshVoyagesList();
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
      refreshVoyagesList();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Lỗi khi từ chối');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MasterLayout>
      <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              🗺️ Thiết lập Lộ trình Hải trình
            </Title>
            <Text type="secondary">
              Click trực tiếp lên biển để vẽ thủ công, hoặc bấm nút tự động để hệ thống tính toán luồng an toàn.
            </Text>
          </Col>
        </Row>

        <Card bordered={false} style={{ marginBottom: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <Row gutter={16} align="middle">
            <Col span={8}>
              <Text strong>Chọn chuyến đi:</Text>
              <Select
                style={{ width: '100%', marginTop: 8 }}
                placeholder="Chọn chuyến đi"
                value={selectedVoyageId}
                onChange={handleSelectVoyage}
                loading={loading}
              >
                {voyages.map((v) => (
                  <Select.Option key={v.id} value={v.id}>
                    {v.voyageCode || `VY-${String(v.id).padStart(4, '0')}`} - {v.departurePort} đến {v.destinationPort} (
                    {v.Ship?.shipName})
                    {v.routeStatus === 'Pending' && (
                      <Tag color="warning" style={{ marginLeft: 8 }}>
                        Chờ duyệt
                      </Tag>
                    )}
                    {v.routeStatus === 'Approved' && (
                      <Tag color="success" style={{ marginLeft: 8 }}>
                        Đã duyệt
                      </Tag>
                    )}
                    {(!v.routeStatus || v.routeStatus === 'Draft') && (
                      <Tag color="default" style={{ marginLeft: 8 }}>
                        Nháp
                      </Tag>
                    )}
                  </Select.Option>
                ))}
              </Select>
            </Col>

            <Col span={16} style={{ textAlign: 'right', marginTop: 28 }}>
              <Space wrap>
                {!isReadOnly && (
                  <>
                    <Button
                      type="primary"
                      icon={<ThunderboltOutlined />}
                      onClick={handleAutoGenerateRoute}
                      disabled={!selectedVoyageId}
                      style={{ background: '#0284c7', borderColor: '#0284c7' }}
                    >
                      🚀 Tự động vẽ Luồng Hàng hải
                    </Button>
                    <Button icon={<UndoOutlined />} onClick={handleUndo} disabled={waypoints.length <= 2}>
                      Hoàn tác
                    </Button>
                    <Button icon={<ClearOutlined />} onClick={handleResetToPorts} disabled={waypoints.length <= 2}>
                      Xóa mốc trung gian
                    </Button>
                    <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
                      Lưu lộ trình
                    </Button>
                  </>
                )}

                {userRole === 'chiefofficer' &&
                  (!selectedVoyage?.routeStatus || selectedVoyage?.routeStatus === 'Draft') && (
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={handleSubmitReview}
                      loading={saving}
                      disabled={waypoints.length === 0 || !routeSafety.isSafe}
                      style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
                    >
                      Gửi duyệt
                    </Button>
                  )}

                {userRole === 'master' && selectedVoyage?.routeStatus === 'Pending' && (
                  <>
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={handleApprove}
                      loading={saving}
                      style={{ background: '#10b981', borderColor: '#10b981' }}
                      disabled={!routeSafety.isSafe}
                    >
                      Phê duyệt
                    </Button>
                    <Button
                      danger
                      icon={<CloseOutlined />}
                      onClick={handleReject}
                      loading={saving}
                    >
                      Từ chối
                    </Button>
                  </>
                )}
              </Space>
            </Col>
          </Row>

          {/* Metric Bar: Thông số lộ trình & Trạng thái an toàn */}
          <div
            style={{
              marginTop: 16,
              padding: '10px 16px',
              background: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <Space size="large" wrap>
              <span>
                <CompassOutlined style={{ color: '#0284c7', marginRight: 6 }} />
                <strong>Khoảng cách ước tính:</strong>{' '}
                <span style={{ color: '#0284c7', fontWeight: 700 }}>
                  {totalDistanceNM.toLocaleString('vi-VN')} Hải lý (~{Math.round(totalDistanceNM * 1.852).toLocaleString('vi-VN')} km)
                </span>
              </span>
              <span>
                <EnvironmentOutlined style={{ color: '#6366f1', marginRight: 6 }} />
                <strong>Số điểm Waypoints:</strong> <strong>{waypoints.length} điểm</strong>
              </span>
              <span>
                <strong>Kiểm tra An toàn:</strong>{' '}
                {waypoints.length < 2 ? (
                  <Tag color="default" style={{ marginLeft: 6 }}>
                    Chưa có lộ trình
                  </Tag>
                ) : routeSafety.isSafe ? (
                  <Tag color="success" style={{ marginLeft: 6 }}>
                    ✅ Luồng An toàn (100% trên biển)
                  </Tag>
                ) : (
                  <Tag color="error" style={{ marginLeft: 6 }}>
                    ⚠️ Cắt ngang đất liền ({routeSafety.unsafeSegments.length} đoạn vi phạm)
                  </Tag>
                )}
              </span>
            </Space>

            <Space>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Hiện mốc luồng mẫu:
              </Text>
              <Switch
                checked={showMaritimeHubs}
                onChange={setShowMaritimeHubs}
                size="small"
              />
            </Space>
          </div>

          {/* Cảnh báo nếu lộ trình cắt ngang qua đất liền */}
          {!routeSafety.isSafe && (
            <Alert
              type="error"
              showIcon
              style={{ marginTop: 12, borderRadius: 8 }}
              message="Cảnh báo: Đoạn hải trình cắt ngang qua lục địa / đất liền!"
              description={
                <div>
                  Hệ thống phát hiện đoạn đường (gạch đứt màu đỏ) đang chạy xuyên qua đất liền. Tàu biển không thể di chuyển theo tuyến này.
                  <br />
                  👉 Bạn có thể <strong>click thêm điểm trên biển</strong> (hoặc kéo thả mốc) để vòng qua bán đảo, hoặc bấm <strong>"🚀 Tự động vẽ Luồng Hàng hải"</strong> để máy tự tính toán.
                </div>
              }
            />
          )}

          {!isReadOnly && (
            <Row gutter={16} align="middle" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
              <Col span={24}>
                <Space wrap>
                  <Text strong>Thêm toạ độ thủ công:</Text>
                  <Input
                    placeholder="Vĩ độ (Lat) VD: 16.35"
                    value={inputLat}
                    onChange={(e) => setInputLat(e.target.value)}
                    style={{ width: 170 }}
                    disabled={!selectedVoyageId}
                  />
                  <Input
                    placeholder="Kinh độ (Lng) VD: 108.60"
                    value={inputLng}
                    onChange={(e) => setInputLng(e.target.value)}
                    style={{ width: 170 }}
                    disabled={!selectedVoyageId}
                  />
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddWaypoint}
                    disabled={!inputLat || !inputLng}
                    style={{ background: '#3b82f6', borderColor: '#3b82f6' }}
                  >
                    Thêm điểm
                  </Button>
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                    💡 Mẹo: Bạn có thể click chuột trực tiếp vào bất kỳ vị trí nào trên biển để thêm điểm hoặc kéo thả marker.
                  </Text>
                </Space>
              </Col>
            </Row>
          )}
        </Card>

        <Card
          bordered={false}
          styles={{ body: { padding: 0, height: '100%' } }}
          style={{
            borderRadius: 12,
            overflow: 'hidden',
            height: '62vh',
            minHeight: 450,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          {loading ? (
            <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
              <Spin size="large" />
            </div>
          ) : (
            <MapContainer
              center={[14.0, 108.5]} // Center on Southeast Asia / East Sea
              zoom={5}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationMarkers
                waypoints={waypoints}
                setWaypoints={setWaypoints}
                isReadOnly={isReadOnly}
                unsafeSegments={routeSafety.unsafeSegments}
                showMaritimeHubs={showMaritimeHubs}
              />
            </MapContainer>
          )}
        </Card>
      </div>
    </MasterLayout>
  );
}
