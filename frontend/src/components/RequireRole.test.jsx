import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RequireRole from './RequireRole';

function renderGuard({ allow, role = 'Sailor', token = 'token', activeVoyageRole } = {}) {
  if (token) localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify({ role }));
  if (activeVoyageRole) localStorage.setItem('activeVoyageRole', activeVoyageRole);

  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route
          path="/protected"
          element={<RequireRole allow={allow}><div>Protected content</div></RequireRole>}
        />
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/my-voyages" element={<div>My voyages</div>} />
        <Route path="/agency-dashboard" element={<div>Agency dashboard</div>} />
        <Route path="/master-dashboard" element={<div>Master dashboard</div>} />
        <Route path="/crew-dashboard" element={<div>Crew dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireRole', () => {
  test('redirects unauthenticated user to login', () => {
    renderGuard({ allow: ['Sailor'], token: '' });
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  test('renders children for an allowed role', () => {
    renderGuard({ allow: ['Sailor'], role: 'Sailor' });
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  test('allow="any" accepts every authenticated role', () => {
    renderGuard({ allow: 'any', role: 'Agency' });
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  test('redirects onboard user without active voyage role to voyage selection', () => {
    renderGuard({ allow: ['Master'], role: 'Sailor' });
    expect(screen.getByText('My voyages')).toBeInTheDocument();
  });

  test('redirects unauthorized shore user to the correct dashboard', () => {
    renderGuard({ allow: ['Master'], role: 'Admin' });
    expect(screen.getByText('Agency dashboard')).toBeInTheDocument();
  });
});
