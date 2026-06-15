import { useState, useEffect } from 'react';
import MasterLayout from '../components/MasterLayout';
import { profileService } from '../services/api';
import { UserCircle, Award, Edit2, Save, X, Trash2, Plus, CheckCircle, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import Swal from 'sweetalert2';

const STATUS_CONFIG = {
  Valid:   { color: '#10b981', bg: '#d1fae5', icon: <CheckCircle size={13} /> },
  Expired: { color: '#ef4444', bg: '#fee2e2', icon: <AlertCircle size={13} /> },
  Expiring:{ color: '#f59e0b', bg: '#fef3c7', icon: <Clock size={13} /> },
};

function certDisplayStatus(cert) {
  if (cert.status === 'Expired') return 'Expired';
  if (!cert.expiryDate) return cert.status;
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);
  if (new Date(cert.expiryDate) <= soon) return 'Expiring';
  return 'Valid';
}

export default function CrewProfilePage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '' });
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const [showAddCert, setShowAddCert] = useState(false);
  const [certForm, setCertForm] = useState({ certificateName: '', issueDate: '', expiryDate: '', fileUrl: '' });
  const [certError, setCertError] = useState('');
  const [addingCert, setAddingCert] = useState(false);

  const [editingCertId, setEditingCertId] = useState(null);
  const [editCertForm, setEditCertForm] = useState({ certificateName: '', issueDate: '', expiryDate: '', fileUrl: '' });
  const [editCertError, setEditCertError] = useState('');
  const [savingCert, setSavingCert] = useState(false);

  const load = async () => {
    try {
      const data = await profileService.getMe();
      setProfile(data);
      setForm({ fullName: data.fullName || '', phone: data.phone || '' });
    } catch {
      // no profile yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveError('');
    setSaving(true);
    try {
      await profileService.updateMe(form);
      const updated = await profileService.getMe();
      setProfile(updated);
      setEditing(false);
      Swal.fire({ icon: 'success', title: 'Đã lưu', text: 'Cập nhật hồ sơ thành công.', timer: 1500, showConfirmButton: false });
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Lỗi khi lưu.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCert = async (e) => {
    e.preventDefault();
    setCertError('');
    if (!certForm.certificateName || !certForm.issueDate || !certForm.expiryDate) {
      setCertError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (certForm.expiryDate < certForm.issueDate) {
      setCertError('Ngày hết hạn phải sau ngày cấp.');
      return;
    }
    setAddingCert(true);
    try {
      await profileService.addCertificate(certForm);
      await load();
      setShowAddCert(false);
      setCertForm({ certificateName: '', issueDate: '', expiryDate: '', fileUrl: '' });
      Swal.fire({ icon: 'success', title: 'Đã thêm', text: 'Chứng chỉ đã được lưu.', timer: 1500, showConfirmButton: false });
    } catch (err) {
      setCertError(err.response?.data?.message || 'Lỗi khi thêm chứng chỉ.');
    } finally {
      setAddingCert(false);
    }
  };

  const startEditCert = (cert) => {
    setEditingCertId(cert.id);
    setEditCertForm({
      certificateName: cert.certificateName || '',
      issueDate: cert.issueDate || '',
      expiryDate: cert.expiryDate || '',
      fileUrl: cert.fileUrl || '',
    });
    setEditCertError('');
  };

  const handleSaveCert = async (e) => {
    e.preventDefault();
    setEditCertError('');
    if (!editCertForm.certificateName || !editCertForm.issueDate || !editCertForm.expiryDate) {
      setEditCertError('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }
    if (editCertForm.expiryDate < editCertForm.issueDate) {
      setEditCertError('Ngày hết hạn phải sau ngày cấp.');
      return;
    }
    setSavingCert(true);
    try {
      await profileService.updateCertificate(editingCertId, editCertForm);
      await load();
      setEditingCertId(null);
      Swal.fire({ icon: 'success', title: 'Đã lưu', text: 'Cập nhật chứng chỉ thành công.', timer: 1500, showConfirmButton: false });
    } catch (err) {
      setEditCertError(err.response?.data?.message || 'Lỗi khi cập nhật.');
    } finally {
      setSavingCert(false);
    }
  };

  const handleDeleteCert = async (certId, certName) => {
    const result = await Swal.fire({
      title: 'Xóa chứng chỉ?',
      text: certName,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#ef4444',
    });
    if (!result.isConfirmed) return;
    try {
      await profileService.deleteCertificate(certId);
      await load();
    } catch {
      Swal.fire('Lỗi', 'Không thể xóa chứng chỉ.', 'error');
    }
  };

  if (loading) return (
    <MasterLayout>
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: '#64748b' }}>Đang tải...</div>
    </MasterLayout>
  );

  const certs = profile?.CrewCertificates || [];

  return (
    <MasterLayout>
      <div style={{ padding: '28px 32px', maxWidth: 960, margin: '0 auto' }}>

        <h2 style={{ fontWeight: 700, color: '#0f172a', marginBottom: 24, fontSize: 20 }}>
          <UserCircle size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Hồ sơ của tôi
        </h2>

        {/* ── PROFILE CARD ── */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 12 }}>Thông tin cá nhân</p>
              <h3 style={{ margin: '4px 0 0', color: '#fff', fontSize: 18, fontWeight: 700 }}>{profile?.fullName || '—'}</h3>
            </div>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
              >
                <Edit2 size={15} /> Chỉnh sửa
              </button>
            ) : (
              <button
                onClick={() => { setEditing(false); setSaveError(''); setForm({ fullName: profile?.fullName || '', phone: profile?.phone || '' }); }}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
              >
                <X size={15} /> Hủy
              </button>
            )}
          </div>

          <div style={{ padding: '24px 28px' }}>
            {!editing ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 40px' }}>
                {[
                  ['Email (tên đăng nhập)', profile?.User?.username],
                  ['Số điện thoại', profile?.phone || '—'],
                  ['CCCD/CMND', profile?.cccd || '—'],
                  ['Bộ phận', profile?.department === 'Deck' ? 'Boong (Deck)' : profile?.department === 'Engine' ? 'Máy (Engine)' : (profile?.department || '—')],
                  ['Chức danh', profile?.position || '—'],
                  ['Vai trò hệ thống', profile?.User?.role || '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                    <p style={{ margin: 0, color: '#0f172a', fontWeight: 600, fontSize: 15 }}>{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <form onSubmit={handleSaveProfile}>
                {saveError && (
                  <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                    {saveError}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', color: '#374151', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Họ và tên</label>
                    <input
                      value={form.fullName}
                      onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                      required
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#374151', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Số điện thoại</label>
                    <input
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 6 }}>Email — không thể thay đổi</label>
                    <input
                      value={profile?.User?.username || ''}
                      disabled
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: '#f8fafc', color: '#94a3b8', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ── CERTIFICATES ── */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '18px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Award size={20} color="#3b82f6" />
              <h3 style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: 16 }}>Chứng chỉ ({certs.length})</h3>
            </div>
            <button
              onClick={() => { setShowAddCert(true); setCertError(''); }}
              style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}
            >
              <Plus size={15} /> Thêm chứng chỉ
            </button>
          </div>

          {/* Form thêm chứng chỉ */}
          {showAddCert && (
            <div style={{ padding: '20px 28px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 16px', fontWeight: 700, color: '#1e293b', fontSize: 14 }}>Thêm chứng chỉ mới</h4>
              {certError && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{certError}</div>}
              <form onSubmit={handleAddCert}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', color: '#374151', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Tên chứng chỉ *</label>
                    <input
                      placeholder="Ví dụ: Certificate of Competency - OOW"
                      value={certForm.certificateName}
                      onChange={e => setCertForm(f => ({ ...f, certificateName: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#374151', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Ngày cấp *</label>
                    <input
                      type="date"
                      value={certForm.issueDate}
                      onChange={e => setCertForm(f => ({ ...f, issueDate: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#374151', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Ngày hết hạn *</label>
                    <input
                      type="date"
                      value={certForm.expiryDate}
                      onChange={e => setCertForm(f => ({ ...f, expiryDate: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', color: '#374151', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      Link tài liệu <span style={{ color: '#94a3b8', fontWeight: 400 }}>(tùy chọn — Google Drive, Dropbox...)</span>
                    </label>
                    <input
                      placeholder="https://drive.google.com/..."
                      value={certForm.fileUrl}
                      onChange={e => setCertForm(f => ({ ...f, fileUrl: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" disabled={addingCert} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                    {addingCert ? 'Đang lưu...' : 'Lưu'}
                  </button>
                  <button type="button" onClick={() => { setShowAddCert(false); setCertError(''); }} style={{ background: '#fff', color: '#64748b', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13 }}>
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Danh sách chứng chỉ */}
          <div style={{ padding: '8px 0' }}>
            {certs.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                <Award size={40} style={{ marginBottom: 10, opacity: 0.3 }} />
                <p style={{ margin: 0 }}>Chưa có chứng chỉ nào. Nhấn "Thêm chứng chỉ" để bắt đầu.</p>
              </div>
            ) : (
              certs.map(cert => {
                const displayStatus = certDisplayStatus(cert);
                const cfg = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.Valid;
                const isEditing = editingCertId === cert.id;

                return (
                  <div key={cert.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {/* Normal row */}
                    {!isEditing && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{cert.certificateName}</p>
                          <p style={{ margin: 0, color: '#64748b', fontSize: 12 }}>
                            Cấp: {cert.issueDate || '—'} &nbsp;·&nbsp; Hết hạn: {cert.expiryDate || '—'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ background: cfg.bg, color: cfg.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {cfg.icon}
                            {displayStatus === 'Expiring' ? 'Sắp hết hạn' : displayStatus === 'Expired' ? 'Hết hạn' : 'Còn hiệu lực'}
                          </span>
                          {cert.fileUrl && (
                            <a href={cert.fileUrl} target="_blank" rel="noopener noreferrer" title="Xem tài liệu" style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', padding: '4px' }}>
                              <ExternalLink size={16} />
                            </a>
                          )}
                          <button onClick={() => startEditCert(cert)} title="Chỉnh sửa" style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', borderRadius: 6, display: 'flex', alignItems: 'center' }}>
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDeleteCert(cert.id, cert.certificateName)} title="Xóa" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', borderRadius: 6, display: 'flex', alignItems: 'center' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Inline edit form */}
                    {isEditing && (
                      <div style={{ padding: '16px 28px', background: '#f8fafc' }}>
                        <h4 style={{ margin: '0 0 12px', fontWeight: 700, color: '#1e293b', fontSize: 13 }}>Chỉnh sửa chứng chỉ</h4>
                        {editCertError && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '8px 12px', borderRadius: 8, marginBottom: 10, fontSize: 13 }}>{editCertError}</div>}
                        <form onSubmit={handleSaveCert}>
                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 10 }}>
                            <div>
                              <label style={{ display: 'block', color: '#374151', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Tên chứng chỉ *</label>
                              <input value={editCertForm.certificateName} onChange={e => setEditCertForm(f => ({ ...f, certificateName: e.target.value }))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                            </div>
                            <div>
                              <label style={{ display: 'block', color: '#374151', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Ngày cấp *</label>
                              <input type="date" value={editCertForm.issueDate} onChange={e => setEditCertForm(f => ({ ...f, issueDate: e.target.value }))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                            </div>
                            <div>
                              <label style={{ display: 'block', color: '#374151', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Ngày hết hạn *</label>
                              <input type="date" value={editCertForm.expiryDate} onChange={e => setEditCertForm(f => ({ ...f, expiryDate: e.target.value }))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                              <label style={{ display: 'block', color: '#374151', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Link tài liệu <span style={{ color: '#94a3b8', fontWeight: 400 }}>(tùy chọn)</span></label>
                              <input placeholder="https://drive.google.com/..." value={editCertForm.fileUrl} onChange={e => setEditCertForm(f => ({ ...f, fileUrl: e.target.value }))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="submit" disabled={savingCert} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Save size={14} /> {savingCert ? 'Đang lưu...' : 'Lưu'}
                            </button>
                            <button type="button" onClick={() => { setEditingCertId(null); setEditCertError(''); }} style={{ background: '#fff', color: '#64748b', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13 }}>
                              Hủy
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </MasterLayout>
  );
}
