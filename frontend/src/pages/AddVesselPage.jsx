import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Search,
  Bell,
  HelpCircle,
  Info,
  Settings,
  Plus,
  Trash2,
  Upload,
  MoreVertical,
  Save,
  Thermometer,
  Gauge,
  Droplets,
  FileText,
  Box,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import './AddVesselPage.css'; 
import AgencyLayout from '../components/AgencyLayout';
import { vesselService } from '../services/api';

export default function AddVesselPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  // Modal State
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Basic Info State
  const [basicInfo, setBasicInfo] = useState({
    shipName: '',
    imoNumber: '',
    flag: '',
    status: 'Hoạt động'
  });

  // Capacity State
  const [capacity, setCapacity] = useState({
    maxWeight: '',
    maxVolume: '',
    maxCrew: 25
  });

  // Holds State
  const [holds, setHolds] = useState([]);

  // Engine & Parameters State
  const [mainEngine, setMainEngine] = useState({
    engineName: '',
    engineType: 'Diesel 2-kỳ',
    status: 'Hoạt động',
    maxTemp: '',
    maxPressure: '',
    maxSteam: ''
  });

  const [generatorEngines, setGeneratorEngines] = useState([
    {
      id: 1,
      engineName: '',
      engineType: 'Diesel 4-kỳ',
      status: 'Hoạt động',
      maxTemp: '',
      maxPressure: '',
      maxSteam: ''
    }
  ]);

  // Equipment State
  const [equipment, setEquipment] = useState([]);

  useEffect(() => {
    if (isEditMode) {
      const fetchVessel = async () => {
        try {
          const data = await vesselService.getById(id);
          setBasicInfo({
            shipName: data.shipName || '',
            imoNumber: data.imoNumber || '',
            flag: data.flag || '',
            status: data.status || 'Hoạt động'
          });
          if (data.ShipCapacity) {
            setCapacity({
              maxWeight: data.ShipCapacity.maxCargoWeight || '',
              maxVolume: data.ShipCapacity.maxCargoVolume || '',
              maxCrew: data.ShipCapacity.maxCrew || 25
            });
          }

          if (data.Engines && data.Engines.length > 0) {
            // Máy chính: Giả định là máy đầu tiên không phải máy đèn
            const me = data.Engines.find(e => e.engineType === 'Diesel 2-kỳ') || data.Engines[0];
            if (me) {
              const temp = me.EngineParameters?.find(p => p.name === 'Nhiệt độ')?.maxValue || '';
              const press = me.EngineParameters?.find(p => p.name === 'Áp suất')?.maxValue || '';
              const steam = me.EngineParameters?.find(p => p.name === 'Hơi nước')?.maxValue || '';
              setMainEngine({
                id: me.id,
                engineName: me.engineName,
                engineType: me.engineType,
                status: me.status,
                maxTemp: temp,
                maxPressure: press,
                maxSteam: steam
              });
            }

            // Máy đèn
            const gens = data.Engines.filter(e => e.id !== (me ? me.id : null));
            if (gens.length > 0) {
              setGeneratorEngines(gens.map(g => {
                const temp = g.EngineParameters?.find(p => p.name === 'Nhiệt độ')?.maxValue || '';
                const press = g.EngineParameters?.find(p => p.name === 'Áp suất')?.maxValue || '';
                const steam = g.EngineParameters?.find(p => p.name === 'Hơi nước')?.maxValue || '';
                return {
                  id: g.id,
                  engineName: g.engineName,
                  engineType: g.engineType,
                  status: g.status,
                  maxTemp: temp,
                  maxPressure: press,
                  maxSteam: steam
                };
              }));
            }
          }

          if (data.CargoHolds && data.CargoHolds.length > 0) {
            setHolds(data.CargoHolds.map(h => ({
              id: h.id,
              name: h.holdName,
              capacity: h.maxCapacity
            })));
          }

          if (data.Equipment && data.Equipment.length > 0) {
            setEquipment(data.Equipment.map(eq => ({
              id: eq.id,
              name: eq.equipmentName,
              type: eq.equipmentType,
              location: eq.location,
              condition: eq.status
            })));
          }
        } catch (error) {
          console.error('Lỗi tải thông tin tàu:', error);
          alert('Không thể tải thông tin tàu');
        }
      };
      fetchVessel();
    }
  }, [id, isEditMode]);

  // Handlers
  const handleBasicInfoChange = (e) => {
    const { name, value } = e.target;
    setBasicInfo({ ...basicInfo, [name]: value });
  };

  const handleCapacityChange = (e) => {
    const { name, value } = e.target;
    setCapacity({ ...capacity, [name]: value });
  };

  const handleMainEngineChange = (e) => {
    const { name, value } = e.target;
    setMainEngine({ ...mainEngine, [name]: value });
  };

  const handleGeneratorEngineChange = (id, e) => {
    const { name, value } = e.target;
    setGeneratorEngines(generatorEngines.map(engine => 
      engine.id === id ? { ...engine, [name]: value } : engine
    ));
  };

  const addGeneratorEngine = () => {
    const newId = generatorEngines.length > 0 ? Math.max(...generatorEngines.map(e => e.id)) + 1 : 1;
    setGeneratorEngines([...generatorEngines, {
      id: newId,
      engineName: '',
      engineType: 'Diesel 4-kỳ',
      status: 'Hoạt động',
      maxTemp: '',
      maxPressure: '',
      maxSteam: ''
    }]);
  };

  const removeGeneratorEngine = (id) => {
    setGeneratorEngines(generatorEngines.filter(e => e.id !== id));
  };

  const addHold = () => {
    const newId = holds.length > 0 ? Math.max(...holds.map(h => h.id)) + 1 : 1;
    setHolds([...holds, { id: newId, name: '', capacity: '' }]);
  };

  const handleHoldChange = (id, e) => {
    const { name, value } = e.target;
    setHolds(holds.map(h => h.id === id ? { ...h, [name]: value } : h));
  };

  const removeHold = (id) => {
    setHolds(holds.filter(h => h.id !== id));
  };

  const addEquipment = () => {
    const newId = equipment.length > 0 ? Math.max(...equipment.map(e => e.id)) + 1 : 1;
    setEquipment([...equipment, { id: newId, name: '', type: '', location: '', condition: 'Đúng hạn' }]);
  };

  const handleEquipmentChange = (id, e) => {
    const { name, value } = e.target;
    setEquipment(equipment.map(eq => eq.id === id ? { ...eq, [name]: value } : eq));
  };

  const removeEquipment = (id) => {
    setEquipment(equipment.filter(e => e.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation: Tổng thể tích khoang phải BẰNG Thể tích Max của tàu
    if (holds && holds.length > 0 && capacity && capacity.maxVolume) {
      const totalHoldsVolume = holds.reduce((sum, h) => sum + (parseFloat(h.capacity) || 0), 0);
      const shipMaxVolume = parseFloat(capacity.maxVolume) || 0;
      
      if (totalHoldsVolume !== shipMaxVolume) {
        setErrorMsg(`Tổng thể tích các khoang (${totalHoldsVolume.toLocaleString()} m³) đang không khớp với Thể tích Max của tàu (${shipMaxVolume.toLocaleString()} m³).\n\nVui lòng phân bổ lại sức chứa khoang hàng cho hợp lý!`);
        return; // Dừng việc submit
      }
    }

    try {
      const payload = {
        basicInfo,
        capacity,
        mainEngine,
        generatorEngines,
        holds,
        equipment
      };
      
      if (isEditMode) {
        await vesselService.update(id, payload);
        setSuccessMsg('Cập nhật thông tin tàu thành công!');
      } else {
        await vesselService.create(payload);
        setSuccessMsg('Thêm tàu mới thành công!');
      }
      // Không gọi navigate ngay, đợi user click OK trên modal success
    } catch (error) {
      console.error('Lỗi lưu tàu:', error);
      setErrorMsg('Có lỗi hệ thống xảy ra khi lưu thông tin tàu. Vui lòng thử lại sau.');
    }
  };

  const handleSuccessClose = () => {
    setSuccessMsg('');
    navigate('/vessels');
  };

  return (
    <AgencyLayout>
      {errorMsg && (
        <div className="v-error-modal-overlay">
          <div className="v-error-modal">
            <div className="v-error-modal-header">
              <div className="v-error-modal-icon">
                <AlertTriangle size={20} />
              </div>
              <h3>Cảnh báo Phân bổ Sức chứa</h3>
            </div>
            <div className="v-error-modal-body">
              {errorMsg.split('\n').map((line, idx) => (
                <p key={idx} style={{ margin: '0 0 8px 0' }}>{line}</p>
              ))}
            </div>
            <div className="v-error-modal-footer">
              <button type="button" onClick={() => setErrorMsg('')} className="v-btn-error-close">
                Đã hiểu & Sửa lại
              </button>
            </div>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="v-error-modal-overlay">
          <div className="v-error-modal">
            <div className="v-success-modal-header">
              <div className="v-success-modal-icon">
                <CheckCircle size={20} />
              </div>
              <h3>Thành công</h3>
            </div>
            <div className="v-error-modal-body">
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 500, color: '#0f172a' }}>{successMsg}</p>
            </div>
            <div className="v-error-modal-footer">
              <button type="button" onClick={handleSuccessClose} className="v-btn-success-close">
                Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="add-vessel-layout-inner">
        {/* Top Navigation Bar */}
      <header className="vessel-top-bar">
        <div className="vessel-top-left">
          <h1 className="vessel-page-title">{isEditMode ? 'Cập nhật Thông tin Tàu' : 'Thêm Tàu Mới'}</h1>
          <div className="vessel-tabs">
            <button className="v-tab active">Thông tin chung</button>
          </div>
        </div>
        
        <div className="vessel-top-right">
          <div className="vessel-search-box">
            <Search size={16} className="v-search-icon" />
            <input type="text" placeholder="Tìm kiếm hệ thống..." />
          </div>
          <Bell className="v-icon-btn" size={20} />
          <HelpCircle className="v-icon-btn" size={20} />
        </div>
      </header>

      {/* Main Content Form */}
      <div className="vessel-main-content">
        <form className="vessel-form-grid" onSubmit={handleSubmit}>
          
          {/* LEFT COLUMN */}
          <div className="vessel-col-left">
            
            {/* Card: Basic Info */}
            <div className="v-card">
              <div className="v-card-header">
                <Info size={18} color="#ffffff" />
                <h3>THÔNG TIN CƠ BẢN (SHIP)</h3>
              </div>
              <div className="v-card-body">
                <div className="v-form-row">
                  <div className="v-form-group">
                    <label>Tên Tàu <span className="text-red">*</span></label>
                    <input 
                      type="text" 
                      name="shipName"
                      placeholder="Ví dụ: Blue Atlantic Voyager" 
                      value={basicInfo.shipName}
                      onChange={handleBasicInfoChange}
                      required
                    />
                  </div>
                  <div className="v-form-group">
                    <label>Mã số IMO <span className="text-red">*</span></label>
                    <input 
                      type="text" 
                      name="imoNumber"
                      placeholder="IMO 1234567" 
                      value={basicInfo.imoNumber}
                      onChange={handleBasicInfoChange}
                      required
                    />
                  </div>
                </div>

                <div className="v-form-row">
                  <div className="v-form-group">
                    <label>Quốc tịch (Flag)</label>
                    <select name="flag" value={basicInfo.flag} onChange={handleBasicInfoChange}>
                      <option value="">Chọn quốc gia treo cờ</option>
                      <option value="VN">Việt Nam</option>
                      <option value="PA">Panama</option>
                      <option value="LR">Liberia</option>
                    </select>
                  </div>
                  <div className="v-form-group">
                    <label>Trạng thái hiện tại</label>
                    <div className="v-toggle-group">
                      <button 
                        type="button" 
                        className={`v-toggle-btn ${basicInfo.status === 'Hoạt động' ? 'active' : ''}`}
                        onClick={() => setBasicInfo({...basicInfo, status: 'Hoạt động'})}
                      >Hoạt động</button>
                      <button 
                        type="button" 
                        className={`v-toggle-btn ${basicInfo.status === 'Đang sửa chữa' ? 'active' : ''}`}
                        onClick={() => setBasicInfo({...basicInfo, status: 'Đang sửa chữa'})}
                      >Đang sửa chữa</button>
                      <button 
                        type="button" 
                        className={`v-toggle-btn ${basicInfo.status === 'Dự phòng' ? 'active' : ''}`}
                        onClick={() => setBasicInfo({...basicInfo, status: 'Dự phòng'})}
                      >Dự phòng</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card: Tech Specs & Equipment */}
            <div className="v-card mt-20">
              <div className="v-card-header">
                <Settings size={18} color="#ffffff" />
                <h3>THÔNG SỐ KỸ THUẬT & THIẾT BỊ</h3>
              </div>
              <div className="v-card-body p-0">
                
                {/* Main Engine Section */}
                <div className="v-sub-section">
                  <div className="v-sub-header">
                    <h4>Máy chính</h4>
                    <span className="v-badge-blue">YÊU CẦU</span>
                  </div>
                  
                  <div className="v-form-row">
                    <div className="v-form-group">
                      <label>Tên động cơ</label>
                      <input type="text" name="engineName" placeholder="Wärtsilä 14RT" value={mainEngine.engineName} onChange={handleMainEngineChange}/>
                    </div>
                    <div className="v-form-group">
                      <label>Trạng thái</label>
                      <select name="status" value={mainEngine.status} onChange={handleMainEngineChange}>
                        <option value="Hoạt động">Hoạt động</option>
                        <option value="Tạm ngưng">Tạm ngưng</option>
                      </select>
                    </div>
                  </div>

                  {/* Engine Parameters Thresholds */}
                  <div className="v-threshold-box">
                    <h5>Hạn mức chỉ số an toàn (Max Thresholds)</h5>
                    <div className="v-form-row">
                      <div className="v-form-group">
                        <label><Thermometer size={14}/> Nhiệt độ Max (°C)</label>
                        <input type="number" name="maxTemp" placeholder="vd: 95" value={mainEngine.maxTemp} onChange={handleMainEngineChange}/>
                      </div>
                      <div className="v-form-group">
                        <label><Gauge size={14}/> Áp suất Max (Bar)</label>
                        <input type="number" name="maxPressure" placeholder="vd: 15" value={mainEngine.maxPressure} onChange={handleMainEngineChange}/>
                      </div>
                      <div className="v-form-group">
                        <label><Droplets size={14}/> Hơi nước Max (%)</label>
                        <input type="number" name="maxSteam" placeholder="vd: 80" value={mainEngine.maxSteam} onChange={handleMainEngineChange}/>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Generator Engine Section */}
                <div className="v-sub-section border-top">
                  <div className="v-sub-header">
                    <h4>Máy đèn (Generator)</h4>
                    <button type="button" className="v-btn-text" onClick={addGeneratorEngine}>
                      <Plus size={14}/> Thêm máy đèn
                    </button>
                  </div>
                  
                  {generatorEngines.map((gen, index) => (
                    <div key={gen.id} style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: index < generatorEngines.length - 1 ? '1px dashed #cbd5e1' : 'none' }}>
                      <div className="v-sub-header" style={{ marginBottom: '8px' }}>
                        <h5 style={{ margin: 0, fontSize: '13px', color: '#ffffff' }}>Máy đèn #{index + 1}</h5>
                        {generatorEngines.length > 1 && (
                          <button type="button" className="v-btn-icon text-red" onClick={() => removeGeneratorEngine(gen.id)}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <div className="v-form-row">
                        <div className="v-form-group">
                          <label>Tên máy</label>
                          <input type="text" name="engineName" placeholder="Caterpillar C32" value={gen.engineName} onChange={(e) => handleGeneratorEngineChange(gen.id, e)}/>
                        </div>
                        <div className="v-form-group">
                          <label>Trạng thái</label>
                          <select name="status" value={gen.status} onChange={(e) => handleGeneratorEngineChange(gen.id, e)}>
                            <option value="Hoạt động">Hoạt động</option>
                            <option value="Tạm ngưng">Tạm ngưng</option>
                          </select>
                        </div>
                      </div>

                      {/* Engine Parameters Thresholds */}
                      <div className="v-threshold-box" style={{ marginTop: '8px' }}>
                        <h5>Hạn mức chỉ số an toàn (Max Thresholds)</h5>
                        <div className="v-form-row" style={{ marginBottom: 0 }}>
                          <div className="v-form-group">
                            <label><Thermometer size={14}/> Nhiệt độ Max (°C)</label>
                            <input type="number" name="maxTemp" placeholder="vd: 90" value={gen.maxTemp} onChange={(e) => handleGeneratorEngineChange(gen.id, e)}/>
                          </div>
                          <div className="v-form-group">
                            <label><Gauge size={14}/> Áp suất Max (Bar)</label>
                            <input type="number" name="maxPressure" placeholder="vd: 12" value={gen.maxPressure} onChange={(e) => handleGeneratorEngineChange(gen.id, e)}/>
                          </div>
                          <div className="v-form-group">
                            <label><Droplets size={14}/> Hơi nước Max (%)</label>
                            <input type="number" name="maxSteam" placeholder="vd: 75" value={gen.maxSteam} onChange={(e) => handleGeneratorEngineChange(gen.id, e)}/>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Equipment Section */}
                <div className="v-sub-section border-top">
                  <div className="v-sub-header">
                    <h4>Danh mục thiết bị (Equipment)</h4>
                    <button type="button" className="v-btn-text" onClick={addEquipment}>
                      <Plus size={14}/> Thêm thiết bị
                    </button>
                  </div>
                  
                  <div className="v-table-responsive">
                    <table className="v-table">
                      <thead>
                        <tr>
                          <th>Tên thiết bị</th>
                          <th>Loại</th>
                          <th>Vị trí</th>
                          <th>Tình trạng</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {equipment.map(item => (
                          <tr key={item.id}>
                            <td><input type="text" name="name" className="v-input-sm" value={item.name} onChange={(e) => handleEquipmentChange(item.id, e)} placeholder="Tên thiết bị..." /></td>
                            <td><input type="text" name="type" className="v-input-sm" value={item.type} onChange={(e) => handleEquipmentChange(item.id, e)} placeholder="Loại..." /></td>
                            <td><input type="text" name="location" className="v-input-sm" value={item.location} onChange={(e) => handleEquipmentChange(item.id, e)} placeholder="Vị trí..." /></td>
                            <td>
                              <select name="condition" className="v-input-sm" value={item.condition} onChange={(e) => handleEquipmentChange(item.id, e)}>
                                <option value="Đúng hạn">Đúng hạn</option>
                                <option value="Quá hạn">Quá hạn</option>
                              </select>
                            </td>
                            <td>
                              <button type="button" className="v-btn-icon text-red" onClick={() => removeEquipment(item.id)}>
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="vessel-col-right">
            
            {/* Card: Capacity */}
            <div className="v-card">
              <div className="v-card-header">
                <Box size={18} color="#ffffff" />
                <h3>SỨC CHỨA & TẢI TRỌNG</h3>
              </div>
              <div className="v-card-body">
                <div className="v-form-row">
                  <div className="v-form-group">
                    <label>Tải trọng Max (Tấn)</label>
                    <input type="number" name="maxWeight" placeholder="50.000" value={capacity.maxWeight} onChange={handleCapacityChange}/>
                  </div>
                  <div className="v-form-group">
                    <label>Thể tích Max (m³)</label>
                    <input type="number" name="maxVolume" placeholder="75.000" value={capacity.maxVolume} onChange={handleCapacityChange}/>
                  </div>
                </div>

                <div className="v-form-group mt-16">
                  <label>Số thủy thủ tối đa</label>
                  <div className="v-slider-wrapper">
                    <input 
                      type="range" 
                      min="1" 
                      max="100" 
                      name="maxCrew"
                      value={capacity.maxCrew} 
                      onChange={handleCapacityChange}
                      className="v-slider"
                    />
                    <span className="v-slider-val">{capacity.maxCrew}</span>
                  </div>
                </div>

                <div className="v-holds-section mt-24">
                  <div className="v-holds-header">
                    <label>Khoang chứa (Cargo Holds)</label>
                    <button type="button" className="v-btn-text" onClick={addHold}>
                      <Plus size={14}/> Thêm khoang
                    </button>
                  </div>
                  <div className="v-holds-list">
                    {holds.map(hold => (
                      <div className="v-hold-item" key={hold.id}>
                        <div className="v-hold-info">
                          <input type="text" name="name" className="v-input-sm fw-bold" value={hold.name} onChange={(e) => handleHoldChange(hold.id, e)} placeholder="Tên khoang..." />
                          <div className="v-hold-cap">
                            Sức chứa: <input type="number" name="capacity" className="v-input-sm w-auto" value={hold.capacity} onChange={(e) => handleHoldChange(hold.id, e)} placeholder="10000" /> m³
                          </div>
                        </div>
                        <div className="v-hold-actions">
                          <span className="v-badge-green">TRỐNG</span>
                          <button type="button" className="v-btn-icon" onClick={() => removeHold(hold.id)}>
                            <Trash2 size={14} color="#ef4444" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Card: Documents */}
            <div className="v-card mt-20">
              <div className="v-card-header">
                <FileText size={18} color="#ffffff" />
                <h3>TÀI LIỆU PHÁP LÝ (DOCUMENTS)</h3>
              </div>
              <div className="v-card-body">
                <div className="v-upload-zone">
                  <Upload size={24} color="#0f3b75" />
                  <p><strong>Kéo thả file để tải lên</strong></p>
                  <span>Hỗ trợ: PDF, PNG, JPG (Tối đa 10MB)</span>
                </div>

                {/* Data mẫu đã bị xóa */}
              </div>
            </div>

          </div>
        </form>
      </div>

      {/* Bottom Footer Bar */}
      <footer className="vessel-bottom-bar">
        <div className="vessel-bottom-left">
          <span className="v-status-sync">
            <span className="v-dot-blue"></span> ĐỒNG BỘ HÓA THỜI GIAN THỰC
          </span>
          <span className="v-id-draft">ID Dự kiến: VES-2024-001</span>
        </div>
        <div className="vessel-bottom-right">
          <button type="button" className="v-btn-cancel" onClick={() => navigate(-1)}>Hủy bỏ</button>
          <button type="button" className="v-btn-save" onClick={handleSubmit}>
            <Save size={16} /> Lưu hồ sơ tàu
          </button>
        </div>
      </footer>

      </div>
    </AgencyLayout>
  );
}
