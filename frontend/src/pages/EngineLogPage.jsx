import React, { useState, useEffect } from 'react';
import { Gauge, Save, Clock, Ship, CheckCircle } from 'lucide-react';
import MasterLayout from '../components/MasterLayout';
import { engineLogService } from '../services/api';
import './EngineLogPage.css';

export default function EngineLogPage() {
  // ===== STATE =====
  const [activeVoyage, setActiveVoyage] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [engines, setEngines] = useState([]);
  const [selectedEngine, setSelectedEngine] = useState(null);
  const [paramValues, setParamValues] = useState({});
  const [note, setNote] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  // ===== BƯỚC 1: Auto-detect Hải trình đang hoạt động =====
  useEffect(() => {
    const fetchActiveVoyage = async () => {
      try {
        const data = await engineLogService.getActiveVoyage();
        setActiveVoyage(data);
        // Lấy danh sách máy từ tàu của hải trình này
        if (data.Ship && data.Ship.Engines) {
          setEngines(data.Ship.Engines);
        }
        // Lấy danh sách ca trực
        const shiftsData = await engineLogService.getShifts(data.id);
        setShifts(shiftsData);
      } catch (error) {
        console.error('Không tìm thấy hải trình đang hoạt động:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchActiveVoyage();
  }, []);

  // ===== BƯỚC 2: Khi chọn Ca trực -> Load lịch sử =====
  const handleShiftChange = async (e) => {
    const shiftId = e.target.value;
    if (!shiftId) {
      setSelectedShift(null);
      setHistory([]);
      return;
    }
    const shift = shifts.find(s => s.id === parseInt(shiftId));
    setSelectedShift(shift);
    setSelectedEngine(null);
    setParamValues({});
    setNote('');

    try {
      const logs = await engineLogService.getHistoryByShift(shiftId);
      setHistory(logs);
    } catch (error) {
      console.error('Lỗi lấy lịch sử ca trực:', error);
    }
  };

  // ===== BƯỚC 3: Chọn máy cần kiểm tra =====
  const handleSelectEngine = (engine) => {
    setSelectedEngine(engine);
    // Reset form
    const defaultValues = {};
    if (engine.EngineParameters) {
      engine.EngineParameters.forEach(p => { defaultValues[p.id] = ''; });
    }
    setParamValues(defaultValues);
    setNote('');
  };

  // ===== BƯỚC 4: Nhập thông số =====
  const handleParamChange = (paramId, value) => {
    setParamValues({ ...paramValues, [paramId]: value });
  };

  // Kiểm tra giá trị có vượt ngưỡng không
  const getValueStatus = (param, value) => {
    if (value === '' || value === null || value === undefined) return '';
    const numVal = parseFloat(value);
    if (isNaN(numVal)) return '';
    if (param.maxValue && numVal > param.maxValue) return 'danger';
    if (param.maxValue && numVal > param.maxValue * 0.9) return 'warning';
    return 'ok';
  };

  // ===== BƯỚC 5: Lưu nhật ký =====
  const handleSubmit = async () => {
    if (!selectedShift || !selectedEngine) {
      alert('Vui lòng chọn ca trực và máy cần kiểm tra');
      return;
    }

    const values = Object.entries(paramValues)
      .filter(([, val]) => val !== '' && val !== null)
      .map(([paramId, value]) => ({
        parameterId: parseInt(paramId),
        value: parseFloat(value)
      }));

    if (values.length === 0) {
      alert('Vui lòng nhập ít nhất 1 thông số');
      return;
    }

    try {
      await engineLogService.create({
        shiftId: selectedShift.id,
        engineId: selectedEngine.id,
        note: note,
        values: values
      });

      setSuccessMsg(`Ghi nhận kiểm tra "${selectedEngine.engineName}" thành công!`);
      setTimeout(() => setSuccessMsg(''), 3000);

      // Refresh lịch sử
      const logs = await engineLogService.getHistoryByShift(selectedShift.id);
      setHistory(logs);

      // Reset form
      setSelectedEngine(null);
      setParamValues({});
      setNote('');
    } catch (error) {
      console.error('Lỗi lưu nhật ký:', error);
      alert('Có lỗi xảy ra khi lưu nhật ký');
    }
  };

  // ===== Format =====
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '';
  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';

  // ===== RENDER =====
  if (loading) return <MasterLayout><div className="el-no-data">Đang tải dữ liệu...</div></MasterLayout>;

  if (!activeVoyage) {
    return (
      <MasterLayout>
        <div className="el-page-header">
          <h1 className="el-page-title"><Gauge size={28} color="#2563eb" /> Nhật ký Kiểm tra Máy</h1>
        </div>
        <div className="el-no-data">
          <p>⚠️ Không có hải trình nào đang hoạt động.</p>
          <p>Hệ thống tự động lấy hải trình có trạng thái "In Progress".</p>
        </div>
      </MasterLayout>
    );
  }

  return (
    <MasterLayout>
      {/* Success Toast */}
      {successMsg && (
        <div style={{
          position: 'fixed', top: 20, right: 20, background: '#16a34a', color: 'white',
          padding: '12px 20px', borderRadius: 8, zIndex: 9999, display: 'flex',
          alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="el-page-header">
        <h1 className="el-page-title"><Gauge size={28} color="#2563eb" /> Nhật ký Kiểm tra Máy</h1>
      </div>

      {/* Thông tin Hải trình (Auto-detect) */}
      <div className="el-info-bar">
        <div className="el-info-card">
          <div className="el-info-card-label"><Ship size={14} /> Hải trình hiện tại</div>
          <div className="el-info-card-value">{activeVoyage.Ship?.shipName || 'N/A'}</div>
          <div className="el-info-card-sub">
            {activeVoyage.departurePort} → {activeVoyage.destinationPort} | {formatDate(activeVoyage.departureDate)} - {formatDate(activeVoyage.arrivalDate)}
          </div>
        </div>

        <div className="el-info-card shift">
          <div className="el-info-card-label"><Clock size={14} /> Chọn Ca trực</div>
          <select className="el-shift-select" onChange={handleShiftChange} value={selectedShift?.id || ''}>
            <option value="">-- Chọn ca trực --</option>
            {shifts.map(s => (
              <option key={s.id} value={s.id}>
                {s.CrewProfile?.fullName} | {formatTime(s.startTime)} - {formatTime(s.endTime)} ({s.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Danh sách Máy (Chỉ hiện khi đã chọn ca trực) */}
      {selectedShift && (
        <>
          <h3 style={{ margin: '0 0 12px', color: '#334155', fontSize: 15 }}>
            Chọn máy cần kiểm tra ({engines.length} máy)
          </h3>
          <div className="el-engine-grid">
            {engines.map(engine => (
              <div
                key={engine.id}
                className={`el-engine-card ${selectedEngine?.id === engine.id ? 'active' : ''}`}
                onClick={() => handleSelectEngine(engine)}
              >
                <div className="el-engine-card-header">
                  <h4>{engine.engineName}</h4>
                  <span className={`el-engine-type-badge ${engine.engineType?.includes('2') ? 'badge-main' : 'badge-gen'}`}>
                    {engine.engineType?.includes('2') ? 'Máy chính' : 'Máy đèn'}
                  </span>
                </div>
                <div className="el-engine-card-body">
                  <div className="el-engine-status">
                    <span className="dot"></span> {engine.status}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                    {engine.EngineParameters?.length || 0} thông số cần kiểm tra
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Form nhập thông số (Chỉ hiện khi đã chọn máy) */}
      {selectedEngine && (
        <div className="el-inspect-panel">
          <div className="el-inspect-header">
            <h3>📋 Kiểm tra: {selectedEngine.engineName} ({selectedEngine.engineType})</h3>
          </div>
          <div className="el-inspect-body">
            <div className="el-param-grid">
              {selectedEngine.EngineParameters?.map(param => {
                const status = getValueStatus(param, paramValues[param.id]);
                return (
                  <div key={param.id} className="el-param-item">
                    <div className="el-param-label">
                      {param.name}
                    </div>
                    <input
                      type="number"
                      className={`el-param-input ${status === 'danger' ? 'danger' : status === 'warning' ? 'warning' : ''}`}
                      placeholder="Nhập giá trị"
                      value={paramValues[param.id] || ''}
                      onChange={(e) => handleParamChange(param.id, e.target.value)}
                    />
                    <div className="el-param-range">
                      {param.minValue != null && `Min: ${param.minValue}`}
                      {param.minValue != null && param.maxValue != null && ' | '}
                      {param.maxValue != null && `Max: ${param.maxValue}`}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 14, fontWeight: 500, color: '#475569', marginBottom: 8, display: 'block' }}>
                Ghi chú (Tình trạng máy, vấn đề phát hiện...)
              </label>
              <textarea
                className="el-note-textarea"
                placeholder="VD: Máy chạy ổn định, không có tiếng kêu bất thường..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <div className="el-inspect-footer">
            <button className="btn-cancel" onClick={() => setSelectedEngine(null)}>Hủy</button>
            <button className="btn-save" onClick={handleSubmit}>
              <Save size={16} /> Lưu Nhật ký
            </button>
          </div>
        </div>
      )}

      {/* Lịch sử kiểm tra trong ca trực này */}
      {selectedShift && (
        <div className="el-history-card">
          <div className="el-history-header">
            <h3>📜 Lịch sử kiểm tra trong ca này</h3>
          </div>
          {history.length > 0 ? (
            <table className="el-history-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Máy</th>
                  <th>Thông số đo</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {history.map(log => (
                  <tr key={log.id}>
                    <td>{formatTime(log.createdAt)}</td>
                    <td style={{ fontWeight: 500 }}>{log.EngineLog?.Engine?.engineName || 'N/A'}</td>
                    <td>
                      {log.EngineLog?.EngineLogValues?.map(v => {
                        const param = v.EngineParameter;
                        const status = param?.maxValue && v.value > param.maxValue ? 'value-danger'
                          : param?.maxValue && v.value > param.maxValue * 0.9 ? 'value-warn' : 'value-ok';
                        return (
                          <span key={v.id} className={`el-value-badge ${status}`} style={{ marginRight: 6 }}>
                            {param?.name}: {v.value}
                          </span>
                        );
                      })}
                    </td>
                    <td>{log.EngineLog?.note || log.content}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="el-no-data">Chưa có kiểm tra nào trong ca trực này.</div>
          )}
        </div>
      )}
    </MasterLayout>
  );
}
