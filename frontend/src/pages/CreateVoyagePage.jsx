import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  Plus,
  Trash2,
  Package,
  Route as RouteIcon,
  Users,
  ArrowRight
} from 'lucide-react';
import MasterLayout from '../components/MasterLayout';
import AgencyLayout from '../components/AgencyLayout';
import { voyageService, vesselService, crewService, cargoService } from '../services/api';
import { useEffect } from 'react';
import Swal from 'sweetalert2';
import './CreateVoyagePage.css';

export default function CreateVoyagePage() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const Layout = (user.role === 'Admin' || user.role === 'Agency') ? AgencyLayout : MasterLayout;

  // Basic Info State
  const [voyageId] = useState('');
  const [shipId, setShipId] = useState('');

  // Route State
  const [routeInfo, setRouteInfo] = useState({
    departurePort: '',
    destinationPort: '',
    departureDate: '',
    arrivalDate: ''
  });

  // Cargo State
  const [cargoList, setCargoList] = useState([]);

  // Crew State
  const [crewList, setCrewList] = useState([]);

  // Options State
  const [availableShips, setAvailableShips] = useState([]);
  const [availableCargos, setAvailableCargos] = useState([]);
  const [availableCrews, setAvailableCrews] = useState([]);
  
  // Capacity Calculations
  const [selectedShipCapacity, setSelectedShipCapacity] = useState({ maxWeight: 0, maxVolume: 0 });
  const [currentCargoTotal, setCurrentCargoTotal] = useState({ weight: 0, volume: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const shipsRes = await vesselService.getAll();
        setAvailableShips(shipsRes || []);

        const crewsRes = await crewService.getAll();
        setAvailableCrews(crewsRes || []);

        const cargosRes = await cargoService.getAllCargos();
        if (cargosRes && cargosRes.data) {
          setAvailableCargos(cargosRes.data);
        }
      } catch (err) {
        console.error("Failed to fetch reference data", err);
      }
    };
    fetchData();
  }, []);

  // Update selected ship capacity when shipId changes
  useEffect(() => {
    if (shipId) {
      const ship = availableShips.find(s => s.id === parseInt(shipId));
      if (ship && ship.ShipCapacity) {
        setSelectedShipCapacity({
          maxWeight: ship.ShipCapacity.maxCargoWeight || 0,
          maxVolume: ship.ShipCapacity.maxCargoVolume || 0
        });
      } else if (ship && ship.ShipCapacities && ship.ShipCapacities.length > 0) {
        setSelectedShipCapacity({
          maxWeight: ship.ShipCapacities[0].maxCargoWeight || 0,
          maxVolume: ship.ShipCapacities[0].maxCargoVolume || 0
        });
      } else {
        setSelectedShipCapacity({ maxWeight: 0, maxVolume: 0 });
      }
    } else {
      setSelectedShipCapacity({ maxWeight: 0, maxVolume: 0 });
    }
  }, [shipId, availableShips]);

  // Update current cargo totals when cargoList changes
  useEffect(() => {
    let tWeight = 0;
    let tVolume = 0;
    cargoList.forEach(item => {
      if (item.cargoId) {
        const cargo = availableCargos.find(c => c.id === parseInt(item.cargoId));
        if (cargo) {
          tWeight += cargo.totalWeight || 0;
          tVolume += cargo.totalVolume || 0;
        }
      }
    });
    setCurrentCargoTotal({ weight: tWeight, volume: tVolume });
  }, [cargoList, availableCargos]);

  // Handlers
  const handleRouteInfoChange = (e) => {
    const { name, value } = e.target;
    setRouteInfo({ ...routeInfo, [name]: value });
  };

  const addCargo = () => {
    const newId = cargoList.length > 0 ? Math.max(...cargoList.map(c => c.id)) + 1 : 1;
    setCargoList([...cargoList, { id: newId, cargoId: '' }]);
  };

  const removeCargo = (id) => {
    setCargoList(cargoList.filter(c => c.id !== id));
  };

  const handleCargoChange = (id, e) => {
    const { name, value } = e.target;
    setCargoList(cargoList.map(c => c.id === id ? { ...c, [name]: value } : c));
  };

  const addCrew = () => {
    const newId = crewList.length > 0 ? Math.max(...crewList.map(c => c.id)) + 1 : 1;
    setCrewList([...crewList, { id: newId, crewId: '', role: '' }]);
  };

  const removeCrew = (id) => {
    setCrewList(crewList.filter(c => c.id !== id));
  };

  const handleCrewChange = (id, e) => {
    const { name, value } = e.target;
    setCrewList(crewList.map(c => c.id === id ? { ...c, [name]: value } : c));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!shipId) {
      return Swal.fire('Lỗi', 'Vui lòng chọn tàu vận chuyển!', 'error');
    }

    if (currentCargoTotal.weight > selectedShipCapacity.maxWeight) {
      return Swal.fire('Lỗi', `Tổng trọng lượng hàng (${currentCargoTotal.weight} MT) vượt quá tải trọng của tàu (${selectedShipCapacity.maxWeight} MT)! Vui lòng điều chỉnh.`, 'error');
    }
    if (currentCargoTotal.volume > selectedShipCapacity.maxVolume) {
      return Swal.fire('Lỗi', `Tổng thể tích hàng (${currentCargoTotal.volume} CBM) vượt quá dung tích của tàu (${selectedShipCapacity.maxVolume} CBM)! Vui lòng điều chỉnh.`, 'error');
    }

    const selectedRoles = crewList.map(c => c.role);
    const requiredRoles = [
      { id: "Captain (CAPT)", name: "Thuyền trưởng" },
      { id: "Đại phó (Chief Officer)", name: "Đại phó" },
      { id: "Sĩ quan boong (Deck Officer)", name: "Sĩ quan boong" },
      { id: "Máy trưởng (Chief Engineer)", name: "Máy trưởng" }
    ];

    const missingRoles = requiredRoles.filter(r => !selectedRoles.includes(r.id));
    if (missingRoles.length > 0) {
      const missingText = missingRoles.map(r => r.name).join(", ");
      return Swal.fire('Thiếu nhân sự chủ chốt', `Không thể tạo hải trình! Chuyến đi bắt buộc phải có đầy đủ Thuyền trưởng và các sĩ quan. Hiện đang thiếu: <b>${missingText}</b>.`, 'warning');
    }

    try {
      const data = { shipId, routeInfo, cargoList, crewList };
      console.log("Saving Voyage:", data);
      await voyageService.createVoyage(data);
      await Swal.fire({ icon: 'success', title: 'Thành công', text: 'Khởi tạo Hải trình thành công!', timer: 2000, showConfirmButton: false });
      navigate('/master-dashboard');
    } catch (error) {
      console.error("Lỗi khi tạo hải trình:", error);
      Swal.fire('Lỗi', 'Lỗi khi khởi tạo hải trình. Vui lòng thử lại.', 'error');
    }
  };

  return (
    <Layout>
      <div className="voyage-page-inner">
        {/* Top Navigation Bar */}
        <header className="voyage-top-bar">
          <div className="voyage-top-left">
            <div>
              <div className="v-breadcrumb">
                <RouteIcon size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Voyages / New
              </div>
              <h1 className="voyage-page-title">Tạo Hải trình Mới</h1>
            </div>
          </div>

          <div className="voyage-top-right">
            <div className="vessel-search-box" style={{ marginRight: '16px' }}>
              <Search size={16} className="v-search-icon" />
              <input type="text" placeholder="Tìm kiếm..." />
            </div>
            <Bell className="v-icon-btn" size={20} style={{ marginRight: '16px' }} />

            <button className="btn-cancel" onClick={() => navigate(-1)}>Hủy</button>
            <button className="btn-draft">Lưu Bản nháp</button>
            <button className="btn-start" onClick={handleSubmit}>Khởi tạo Hải trình</button>
          </div>
        </header>

        {/* Main Content */}
        <div className="voyage-main-content">
          <form className="voyage-grid" onSubmit={handleSubmit}>

            {/* LEFT COLUMN */}
            <div className="voyage-col">

              {/* Card: Identity */}
              <div className="vy-card">
                <div className="vy-card-header">
                  <h3>Thông tin Định danh</h3>
                </div>
                <div className="vy-form-row">
                  <div className="vy-form-group">
                    <label>Mã Hải trình (Tự động)</label>
                    <input type="text" placeholder="(Sẽ tạo tự động)" value={voyageId} disabled style={{ backgroundColor: '#e2e8f0', color: '#64748b' }} />
                  </div>
                  <div className="vy-form-group">
                    <label>Tàu Vận chuyển <span className="text-red">*</span></label>
                    <select value={shipId} onChange={(e) => setShipId(e.target.value)} required>
                      <option value="">Chọn tàu từ hệ thống...</option>
                      {availableShips.map(ship => (
                        <option key={ship.id} value={ship.id}>{ship.shipName} (IMO: {ship.imoNumber})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Card: Route */}
              <div className="vy-card">
                <div className="vy-card-header">
                  <h3>Chi tiết Tuyến đường</h3>
                </div>
                <div className="route-row">
                  <div className="vy-form-group" style={{ flex: 1 }}>
                    <label>Cảng đi <span className="text-red">*</span></label>
                    <input type="text" name="departurePort" placeholder="📍 Nhập tên cảng..." value={routeInfo.departurePort} onChange={handleRouteInfoChange} required />
                  </div>
                  <ArrowRight size={20} className="route-arrow" />
                  <div className="vy-form-group" style={{ flex: 1 }}>
                    <label>Cảng đến <span className="text-red">*</span></label>
                    <input type="text" name="destinationPort" placeholder="📍 Nhập tên cảng..." value={routeInfo.destinationPort} onChange={handleRouteInfoChange} required />
                  </div>
                </div>
                <div className="vy-form-row" style={{ marginTop: '16px', marginBottom: 0 }}>
                  <div className="vy-form-group">
                    <label>Ngày Khởi hành (Dự kiến) <span className="text-red">*</span></label>
                    <input type="date" name="departureDate" value={routeInfo.departureDate} onChange={handleRouteInfoChange} required />
                  </div>
                  <div className="vy-form-group">
                    <label>Ngày Đến (Dự kiến) <span className="text-red">*</span></label>
                    <input type="date" name="arrivalDate" value={routeInfo.arrivalDate} onChange={handleRouteInfoChange} required />
                  </div>
                </div>
              </div>

              {/* Card: Cargo */}
              <div className="vy-card">
                <div className="vy-card-header">
                  <h3>Lô hàng Dự kiến (Tùy chọn)</h3>
                  <button type="button" className="btn-text" onClick={addCargo}>
                    <Plus size={16} /> Thêm Lô hàng
                  </button>
                </div>

                {cargoList.length === 0 ? (
                  <div className="vy-empty-state">
                    <Package size={32} color="#94a3b8" />
                    <p>Chưa có lô hàng nào được liên kết với hải trình này.</p>
                    <span>Bạn có thể thêm lô hàng sau khi lưu hải trình.</span>
                  </div>
                ) : (
                  <div className="vy-list-container">
                    {/* Hiển thị Capacity Indicator */}
                    {shipId && selectedShipCapacity.maxWeight > 0 && (
                      <div className="capacity-indicator" style={{ 
                        marginBottom: '15px', padding: '10px', 
                        backgroundColor: (currentCargoTotal.weight > selectedShipCapacity.maxWeight || currentCargoTotal.volume > selectedShipCapacity.maxVolume) ? '#fef2f2' : '#f0fdf4',
                        border: `1px solid ${(currentCargoTotal.weight > selectedShipCapacity.maxWeight || currentCargoTotal.volume > selectedShipCapacity.maxVolume) ? '#f87171' : '#86efac'}`,
                        borderRadius: '8px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <strong>Kiểm tra tải trọng (Weight):</strong>
                          <span style={{ color: currentCargoTotal.weight > selectedShipCapacity.maxWeight ? 'red' : 'green', fontWeight: 'bold' }}>
                            {currentCargoTotal.weight.toFixed(2)} / {selectedShipCapacity.maxWeight} MT
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong>Kiểm tra thể tích (Volume):</strong>
                          <span style={{ color: currentCargoTotal.volume > selectedShipCapacity.maxVolume ? 'red' : 'green', fontWeight: 'bold' }}>
                            {currentCargoTotal.volume.toFixed(2)} / {selectedShipCapacity.maxVolume} CBM
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {cargoList.map((cargo, index) => (
                      <div className="vy-list-item" key={cargo.id}>
                        <div className="vy-form-group" style={{ flex: 1 }}>
                          <label>Chọn Lô hàng</label>
                          <select name="cargoId" value={cargo.cargoId} onChange={(e) => handleCargoChange(cargo.id, e)}>
                            <option value="">Chọn lô hàng từ hệ thống...</option>
                            {availableCargos.map(ac => (
                              <option key={ac.id} value={ac.id}>
                                {ac.cargoName || `Cargo #${ac.id}`} - {ac.cargoType} ({ac.totalWeight} MT | {ac.totalVolume} CBM)
                              </option>
                            ))}
                          </select>
                        </div>
                        <button type="button" className="v-btn-icon text-red" onClick={() => removeCargo(cargo.id)} style={{ marginBottom: '4px' }}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card: Crew */}
              <div className="vy-card">
                <div className="vy-card-header">
                  <h3>Nhân sự Dự kiến (Voyage Crew)</h3>
                  <button type="button" className="btn-text" onClick={addCrew}>
                    <Plus size={16} /> Thêm Nhân sự
                  </button>
                </div>

                {crewList.length === 0 ? (
                  <div className="vy-empty-state">
                    <Users size={32} color="#94a3b8" />
                    <p>Chưa phân bổ nhân sự cho chuyến đi này.</p>
                    <span>Chọn Thuyền trưởng và các thuyền viên quan trọng.</span>
                  </div>
                ) : (
                  <div className="vy-list-container">
                    {crewList.map((crew, index) => (
                      <div className="vy-list-item" key={crew.id} style={{ gridTemplateColumns: '1.5fr 1fr auto' }}>
                        <div className="vy-form-group">
                          <label>Chọn Nhân sự</label>
                          <select name="crewId" value={crew.crewId} onChange={(e) => handleCrewChange(crew.id, e)} required>
                            <option value="">Chọn thủy thủ...</option>
                            {availableCrews.map(ac => (
                              <option key={ac.id} value={ac.id}>
                                {ac.fullName} ({ac.email}) - {ac.position}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="vy-form-group">
                          <label>Chức danh cho chuyến đi</label>
                          <select name="role" value={crew.role} onChange={(e) => handleCrewChange(crew.id, e)} required>
                            <option value="">Chọn chức danh...</option>
                            <option value="Captain (CAPT)">Thuyền trưởng (Captain)</option>
                            <option value="Sĩ quan boong (Deck Officer)">Sĩ quan boong (Deck Officer)</option>
                            <option value="Đại phó (Chief Officer)">Đại phó (Chief Officer)</option>
                            <option value="Máy trưởng (Chief Engineer)">Máy trưởng (Chief Engineer)</option>
                            <option value="Thủy thủ (Crew)">Thủy thủ (Crew)</option>
                          </select>
                        </div>
                        <button type="button" className="v-btn-icon text-red" onClick={() => removeCrew(crew.id)} style={{ marginBottom: '4px' }}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT COLUMN */}
            <div className="voyage-col">

              {/* Card: Status */}
              <div className="vy-card">
                <div className="vy-card-header">
                  <h3>Trạng thái</h3>
                </div>
                <div className="status-indicator">
                  <div className="status-dot"></div>
                  <div className="status-info">
                    <h4>Bản nháp (Draft)</h4>
                    <p>Hải trình sẽ chuyển sang trạng thái "Đang lên kế hoạch" (Planning) sau khi được khởi tạo.</p>
                  </div>
                </div>
              </div>

              {/* Card: Map */}
              <div className="vy-card">
                <div className="vy-card-header">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RouteIcon size={16} /> Bản đồ Tuyến đường Dự kiến
                  </h3>
                </div>
                <div className="map-placeholder">
                  <RouteIcon size={32} color="#cbd5e1" />
                  <p>Bản đồ sẽ hiển thị sau khi chọn Cảng đi và Cảng đến.</p>
                </div>
              </div>

            </div>

          </form>
        </div>
      </div>
    </Layout>
  );
}
