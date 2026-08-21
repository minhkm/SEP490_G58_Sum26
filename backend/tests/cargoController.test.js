// Quản lý hàng hoá (admin) — kiểm thử cargoController.
// Mock toàn bộ models để test logic validate/khóa lô/thống kê mà không chạm DB.
jest.mock('../src/models', () => ({
  Cargo: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
  CargoItem: { create: jest.fn(), destroy: jest.fn() },
  CargoAllocation: { destroy: jest.fn() },
  CargoHold: { findAll: jest.fn() },
  Voyage: { findAll: jest.fn() },
  VoyageCrew: { findAll: jest.fn() },
  Ship: {},
}));

const { Cargo, CargoItem, CargoAllocation, CargoHold } = require('../src/models');
const controller = require('../src/controllers/cargoController');

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('cargoController · createCargo — validate đầu vào', () => {
  const baseBody = { cargoName: 'Gạo', totalWeight: 100, totalVolume: 50 };

  test('thiếu tên lô hàng → 400', async () => {
    const res = mockRes();
    await controller.createCargo({ body: { ...baseBody, cargoName: '' } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/Tên lô hàng là bắt buộc/);
    expect(Cargo.create).not.toHaveBeenCalled();
  });

  test('tên vượt 255 ký tự → 400', async () => {
    const res = mockRes();
    await controller.createCargo({ body: { ...baseBody, cargoName: 'a'.repeat(256) } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Cargo.create).not.toHaveBeenCalled();
  });

  test.each([
    ['khối lượng <= 0', { totalWeight: 0 }],
    ['khối lượng không phải số', { totalWeight: 'abc' }],
    ['thể tích <= 0', { totalVolume: 0 }],
  ])('%s → 400', async (_label, override) => {
    const res = mockRes();
    await controller.createCargo({ body: { ...baseBody, ...override } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/Khối lượng và thể tích/);
    expect(Cargo.create).not.toHaveBeenCalled();
  });

  test.each([
    ['số lượng không nguyên', 1.5],
    ['số lượng <= 0', 0],
  ])('%s → 400', async (_label, quantity) => {
    const res = mockRes();
    await controller.createCargo({ body: { ...baseBody, quantity } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/Số lượng phải là số nguyên/);
  });

  test('hợp lệ: tạo Cargo + CargoItem mặc định, status "Đã ở cảng"', async () => {
    Cargo.create.mockResolvedValue({ id: 7 });
    CargoItem.create.mockResolvedValue({});
    const res = mockRes();

    await controller.createCargo(
      { body: { cargoName: '  Gạo  ', totalWeight: '100', totalVolume: '50', quantity: '3' } },
      res,
    );

    expect(Cargo.create).toHaveBeenCalledWith(expect.objectContaining({
      cargoName: 'Gạo',
      totalWeight: 100,
      totalVolume: 50,
      quantity: 3,
      status: 'Đã ở cảng',
    }));
    // CargoItem mặc định lấy toàn bộ khối lượng lô hàng, chưa xếp.
    expect(CargoItem.create).toHaveBeenCalledWith(expect.objectContaining({
      cargoId: 7,
      weight: 100,
      volume: 50,
      isLoaded: false,
    }));
    expect(res.json.mock.calls[0][0]).toMatchObject({ success: true });
    expect(res.json.mock.calls[0][0].message).toMatch(/Thêm lô hàng thành công/);
  });
});

describe('cargoController · updateCargo', () => {
  test('không tìm thấy lô hàng → 404', async () => {
    Cargo.findByPk.mockResolvedValue(null);
    const res = mockRes();

    await controller.updateCargo({ params: { id: '99' }, body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('lô đã thuộc hải trình → 400 (khóa chỉnh sửa)', async () => {
    const cargo = { id: 1, voyageId: 5, update: jest.fn() };
    Cargo.findByPk.mockResolvedValue(cargo);
    const res = mockRes();

    await controller.updateCargo({ params: { id: '1' }, body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/không thể chỉnh sửa/);
    expect(cargo.update).not.toHaveBeenCalled();
  });

  test('khối lượng không hợp lệ → 400', async () => {
    Cargo.findByPk.mockResolvedValue({ id: 1, voyageId: null, update: jest.fn() });
    const res = mockRes();

    await controller.updateCargo({ params: { id: '1' }, body: { totalWeight: 0 } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/Khối lượng/);
  });

  test('hợp lệ (lô chưa gán hải trình): trim tên + cập nhật', async () => {
    const cargo = { id: 1, voyageId: null, cargoName: 'Cũ', update: jest.fn().mockResolvedValue() };
    Cargo.findByPk.mockResolvedValue(cargo);
    const res = mockRes();

    await controller.updateCargo({ params: { id: '1' }, body: { cargoName: '  Mới  ', totalWeight: '20' } }, res);

    expect(cargo.update).toHaveBeenCalledWith(expect.objectContaining({ cargoName: 'Mới', totalWeight: 20 }));
    expect(res.json.mock.calls[0][0]).toMatchObject({ success: true });
    expect(res.json.mock.calls[0][0].message).toMatch(/Cập nhật lô hàng thành công/);
  });
});

describe('cargoController · deleteCargo', () => {
  test('không tìm thấy → 404', async () => {
    Cargo.findByPk.mockResolvedValue(null);
    const res = mockRes();

    await controller.deleteCargo({ params: { id: '99' } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('lô đã thuộc hải trình → 400 (khóa xoá)', async () => {
    const cargo = { id: 1, voyageId: 5, destroy: jest.fn() };
    Cargo.findByPk.mockResolvedValue(cargo);
    const res = mockRes();

    await controller.deleteCargo({ params: { id: '1' } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/không thể xoá/);
    expect(cargo.destroy).not.toHaveBeenCalled();
  });

  test('hợp lệ: xoá allocation, item rồi xoá lô', async () => {
    const cargo = { id: 1, voyageId: null, destroy: jest.fn().mockResolvedValue() };
    Cargo.findByPk.mockResolvedValue(cargo);
    CargoAllocation.destroy.mockResolvedValue();
    CargoItem.destroy.mockResolvedValue();
    const res = mockRes();

    await controller.deleteCargo({ params: { id: '1' } }, res);

    expect(CargoAllocation.destroy).toHaveBeenCalledWith({ where: { cargoId: '1' } });
    expect(CargoItem.destroy).toHaveBeenCalledWith({ where: { cargoId: '1' } });
    expect(cargo.destroy).toHaveBeenCalled();
    expect(res.json.mock.calls[0][0]).toMatchObject({ success: true });
    expect(res.json.mock.calls[0][0].message).toMatch(/Xoá lô hàng thành công/);
  });
});

describe('cargoController · getAllCargos — thống kê (admin)', () => {
  test('tính đúng tổng khối lượng, đang vận chuyển, chậm trễ và sức chứa còn lại', async () => {
    Cargo.findAll.mockResolvedValue([
      { totalWeight: 100, status: 'Đã giao' },        // đã giao → không tính "đang vận chuyển"
      { totalWeight: 50, status: 'Đang vận chuyển' }, // đang vận chuyển
      { totalWeight: 25, status: 'Chậm trễ' },        // đang vận chuyển + chậm trễ
    ]);
    CargoHold.findAll.mockResolvedValue([
      { maxCapacity: 1000, currentUsage: 400 },
      { maxCapacity: 500, currentUsage: 100 },
    ]);
    const res = mockRes();

    await controller.getAllCargos({ user: { role: 'Admin' }, query: {} }, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.stats).toEqual({
      totalWeight: 175,
      inTransit: 2,
      delayed: 1,
      remainingCapacity: 1000,          // (1000+500) - (400+100)
      remainingCapacityPercent: 67,     // round(1000/1500*100)
    });
  });

  test('không phải admin và chưa có hồ sơ → trả thống kê 0, data rỗng', async () => {
    const res = mockRes();

    await controller.getAllCargos({ user: { role: 'Master', profileId: null }, query: {} }, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload).toMatchObject({ success: true, data: [] });
    expect(payload.stats.totalWeight).toBe(0);
    expect(Cargo.findAll).not.toHaveBeenCalled();
  });
});
