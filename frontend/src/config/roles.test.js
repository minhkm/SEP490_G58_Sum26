import { beforeEach, describe, expect, test } from 'vitest';
import {
  DECK_LOG_ROLES,
  ENGINE_LOG_ROLES,
  getDashboardPath,
  getEffectiveRole,
} from './roles';

describe('role configuration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('active voyage role takes priority over account role', () => {
    localStorage.setItem('user', JSON.stringify({ role: 'Sailor' }));
    localStorage.setItem('activeVoyageRole', 'Master');
    expect(getEffectiveRole()).toBe('Master');
  });

  test('falls back to the account role', () => {
    localStorage.setItem('user', JSON.stringify({ role: 'EngineCrew' }));
    expect(getEffectiveRole()).toBe('EngineCrew');
  });

  test('handles malformed localStorage user data', () => {
    localStorage.setItem('user', '{invalid-json');
    expect(getEffectiveRole()).toBe('');
  });

  test.each([
    ['Master', '/master-dashboard'],
    ['ChiefOfficer', '/master-dashboard'],
    ['Admin', '/agency-dashboard'],
    ['Agency', '/agency-dashboard'],
    ['Sailor', '/crew-dashboard'],
    ['EngineCrew', '/crew-dashboard'],
  ])('maps %s to its dashboard', (role, path) => {
    expect(getDashboardPath(role)).toBe(path);
  });

  test('keeps log writing roles restricted to the assigned crew role', () => {
    expect(ENGINE_LOG_ROLES).toEqual(['EngineCrew']);
    expect(DECK_LOG_ROLES).toEqual(['Sailor']);
  });
});
