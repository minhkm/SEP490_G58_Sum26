import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import dayjs from 'dayjs';
import EngineLogPage from './EngineLogPage';
import { engineLogService } from '../services/api';

vi.mock('../components/MasterLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));
vi.mock('../components/common', () => ({
  PageHeader: ({ title }) => <h1>{title}</h1>,
  notifyWarning: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock('../services/api', () => ({
  engineLogService: {
    getMyVoyages: vi.fn(),
    getShifts: vi.fn(),
    getHistoryByShift: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    uploadImages: vi.fn(),
  },
  voyageService: {},
}));

describe('EngineLogPage engine status rule', () => {
  beforeEach(() => {
    const now = dayjs();
    const voyage = {
      id: 1,
      status: 'Underway',
      departurePort: 'Hai Phong',
      destinationPort: 'Da Nang',
      Ship: {
        shipName: 'Ocean Star',
        Engines: [
          {
            id: 10,
            engineName: 'Main Engine Operational',
            engineType: 'Diesel 2-kỳ',
            status: 'Operational',
            EngineParameters: [{ id: 101, name: 'Fuel Oil Pressure', maxValue: 5 }],
          },
          {
            id: 11,
            engineName: 'Auxiliary Engine Standby',
            engineType: 'Diesel 4-kỳ',
            status: 'Standby',
            EngineParameters: [{ id: 102, name: 'RPM', maxValue: 900 }],
          },
          {
            id: 12,
            engineName: 'Main Engine Under Maintenance',
            engineType: 'Diesel',
            status: 'Under Maintenance',
            EngineParameters: [{ id: 103, name: 'Cooling Water Temperature', maxValue: 95 }],
          },
        ],
      },
    };
    const shift = {
      id: 20,
      startTime: now.subtract(1, 'hour').toISOString(),
      endTime: now.add(1, 'hour').toISOString(),
      status: 'Active',
      CrewProfile: { fullName: 'Engine Crew' },
    };
    engineLogService.getMyVoyages.mockResolvedValue([voyage]);
    engineLogService.getShifts.mockResolvedValue([shift]);
    engineLogService.getHistoryByShift.mockResolvedValue([]);
  });

  test('shows Operational engines and hides Standby and Under Maintenance engines', async () => {
    const today = dayjs().format('YYYY-MM-DD');
    render(
      <MemoryRouter initialEntries={[`/engine-logs?voyageId=1&date=${today}&shiftId=20`]}>
        <EngineLogPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Main Engine Operational')).toBeInTheDocument();
    expect(screen.queryByText('Auxiliary Engine Standby')).not.toBeInTheDocument();
    expect(screen.queryByText('Main Engine Under Maintenance')).not.toBeInTheDocument();
  });

  test('opens the parameter form when an Operational engine is selected', async () => {
    const today = dayjs().format('YYYY-MM-DD');
    render(
      <MemoryRouter initialEntries={[`/engine-logs?voyageId=1&date=${today}&shiftId=20`]}>
        <EngineLogPage />
      </MemoryRouter>,
    );

    const operational = await screen.findByText('Main Engine Operational');
    expect(screen.queryByText('Auxiliary Engine Standby')).not.toBeInTheDocument();

    fireEvent.click(operational);
    expect(await screen.findByText(/Kiểm tra: Main Engine Operational/)).toBeInTheDocument();
  });
});
