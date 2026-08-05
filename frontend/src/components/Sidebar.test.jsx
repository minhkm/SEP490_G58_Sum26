import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar';
import { voyageService } from '../services/api';

vi.mock('../services/api', () => ({
  voyageService: { getAll: vi.fn() },
}));

function renderSidebar(role, path = '/crew-dashboard') {
  localStorage.setItem('token', 'token');
  localStorage.setItem('user', JSON.stringify({ role }));
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar />
    </MemoryRouter>,
  );
}

describe('Sidebar role-based items', () => {
  beforeEach(() => {
    voyageService.getAll.mockResolvedValue([{ id: 1, status: 'Loaded' }]);
  });

  test.each(['Master', 'ChiefOfficer'])('%s sees vessel supplies management', async (role) => {
    renderSidebar(role, '/master-dashboard');
    expect(await screen.findByText('Thiết bị & Vật tư')).toBeInTheDocument();
    await waitFor(() => expect(voyageService.getAll).toHaveBeenCalled());
  });

  test('EngineOfficer sees engine management but not vessel supplies', () => {
    renderSidebar('EngineOfficer');
    expect(screen.getByText('Quản lý máy')).toBeInTheDocument();
    expect(screen.queryByText('Thiết bị & Vật tư')).not.toBeInTheDocument();
  });

  test('EngineCrew sees engine log entry but not engine management', () => {
    renderSidebar('EngineCrew');
    expect(screen.getByText('Nhật ký Kiểm tra Máy')).toBeInTheDocument();
    expect(screen.queryByText('Quản lý máy')).not.toBeInTheDocument();
  });

  test('Sailor sees deck log entry only', () => {
    renderSidebar('Sailor');
    expect(screen.getByText('Nhật ký Trực boong')).toBeInTheDocument();
    expect(screen.queryByText('Nhật ký Kiểm tra Máy')).not.toBeInTheDocument();
  });
});
