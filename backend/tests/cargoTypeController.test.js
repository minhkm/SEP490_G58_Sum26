// Cấu hình loại hàng hoá — kiểm thử cargoTypeController.
// Mock model CargoType để test riêng phần logic controller (validate + default + not found),
// không phụ thuộc DB thật.
jest.mock('../src/models', () => ({
  CargoType: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
}));

const { CargoType } = require('../src/models');
const controller = require('../src/controllers/cargoTypeController');

// req/res giả lập tối thiểu: status()/json() trả về chính res để chain được.
function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('cargoTypeController · getAllCargoTypes', () => {
  test('trả danh sách loại hàng đã sắp xếp theo tên', async () => {
    const rows = [{ id: 1, name: 'Gạo' }, { id: 2, name: 'Than' }];
    CargoType.findAll.mockResolvedValue(rows);
    const res = mockRes();

    await controller.getAllCargoTypes({}, res);

    expect(CargoType.findAll).toHaveBeenCalledWith({ order: [['name', 'ASC']] });
    expect(res.json).toHaveBeenCalledWith({ success: true, data: rows });
    expect(res.status).not.toHaveBeenCalled();
  });

  test('lỗi truy vấn → 500', async () => {
    CargoType.findAll.mockRejectedValue(new Error('db down'));
    const res = mockRes();

    await controller.getAllCargoTypes({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('cargoTypeController · createCargoType', () => {
  test('thiếu tên → 400', async () => {
    const res = mockRes();
    await controller.createCargoType({ body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/nhập tên loại hàng/);
    expect(CargoType.create).not.toHaveBeenCalled();
  });

  test('tên chỉ gồm khoảng trắng → 400', async () => {
    const res = mockRes();
    await controller.createCargoType({ body: { name: '   ' } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(CargoType.create).not.toHaveBeenCalled();
  });

  test('trùng tên → 409', async () => {
    CargoType.findOne.mockResolvedValue({ id: 5, name: 'Gạo' });
    const res = mockRes();

    await controller.createCargoType({ body: { name: 'Gạo' } }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].message).toMatch(/đã tồn tại/);
    expect(CargoType.create).not.toHaveBeenCalled();
  });

  test('hợp lệ: trim tên + áp default category/unit/stowageFactor', async () => {
    CargoType.findOne.mockResolvedValue(null);
    CargoType.create.mockResolvedValue({ id: 1, name: 'Gạo' });
    const res = mockRes();

    await controller.createCargoType({ body: { name: '  Gạo  ' } }, res);

    expect(CargoType.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Gạo',
      category: 'Bulk',
      defaultUnit: 'MT',
      stowageFactor: 1.0,
    }));
    expect(res.json.mock.calls[0][0]).toMatchObject({ success: true });
    expect(res.json.mock.calls[0][0].message).toMatch(/Thêm loại hàng thành công/);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('nhận stowageFactor và category/unit do người dùng nhập', async () => {
    CargoType.findOne.mockResolvedValue(null);
    CargoType.create.mockResolvedValue({ id: 2 });
    const res = mockRes();

    await controller.createCargoType(
      { body: { name: 'Than', category: 'Bulk', defaultUnit: 'm3', stowageFactor: '1.35' } },
      res,
    );

    expect(CargoType.create).toHaveBeenCalledWith(expect.objectContaining({
      stowageFactor: 1.35,
      defaultUnit: 'm3',
    }));
  });

  test('stowageFactor không hợp lệ → về mặc định 1.0', async () => {
    CargoType.findOne.mockResolvedValue(null);
    CargoType.create.mockResolvedValue({ id: 3 });
    const res = mockRes();

    await controller.createCargoType({ body: { name: 'X', stowageFactor: 'abc' } }, res);

    expect(CargoType.create.mock.calls[0][0].stowageFactor).toBe(1.0);
  });
});

describe('cargoTypeController · updateCargoType', () => {
  test('không tìm thấy → 404', async () => {
    CargoType.findByPk.mockResolvedValue(null);
    const res = mockRes();

    await controller.updateCargoType({ params: { id: '99' }, body: { name: 'A' } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('đổi tên thành rỗng → 400', async () => {
    CargoType.findByPk.mockResolvedValue({ id: 1, name: 'Gạo', update: jest.fn() });
    const res = mockRes();

    await controller.updateCargoType({ params: { id: '1' }, body: { name: '  ' } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/không được để trống/);
  });

  test('đổi sang tên đã thuộc loại hàng khác → 409', async () => {
    CargoType.findByPk.mockResolvedValue({ id: 1, name: 'Gạo', update: jest.fn() });
    CargoType.findOne.mockResolvedValue({ id: 2, name: 'Than' });
    const res = mockRes();

    await controller.updateCargoType({ params: { id: '1' }, body: { name: 'Than' } }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].message).toMatch(/đã tồn tại/);
  });

  test('hợp lệ: trim tên + parse stowageFactor rồi update', async () => {
    const instance = {
      id: 1, name: 'Gạo', category: 'Bulk', defaultUnit: 'MT', stowageFactor: 1.0, description: null,
      update: jest.fn().mockResolvedValue(),
    };
    CargoType.findByPk.mockResolvedValue(instance);
    CargoType.findOne.mockResolvedValue(null);
    const res = mockRes();

    await controller.updateCargoType({ params: { id: '1' }, body: { name: '  Ngô  ', stowageFactor: '2' } }, res);

    expect(instance.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ngô', stowageFactor: 2 }));
    expect(res.json.mock.calls[0][0]).toMatchObject({ success: true });
    expect(res.json.mock.calls[0][0].message).toMatch(/Cập nhật loại hàng thành công/);
  });

  test('stowageFactor không hợp lệ → giữ nguyên giá trị cũ', async () => {
    const instance = { id: 1, name: 'Gạo', category: 'Bulk', defaultUnit: 'MT', stowageFactor: 1.0, description: null, update: jest.fn().mockResolvedValue() };
    CargoType.findByPk.mockResolvedValue(instance);
    const res = mockRes();

    await controller.updateCargoType({ params: { id: '1' }, body: { stowageFactor: 'xx' } }, res);

    expect(instance.update.mock.calls[0][0].stowageFactor).toBe(1.0);
  });
});

describe('cargoTypeController · deleteCargoType', () => {
  test('không tìm thấy → 404', async () => {
    CargoType.findByPk.mockResolvedValue(null);
    const res = mockRes();

    await controller.deleteCargoType({ params: { id: '99' } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('hợp lệ → gọi destroy và báo thành công', async () => {
    const instance = { id: 1, destroy: jest.fn().mockResolvedValue() };
    CargoType.findByPk.mockResolvedValue(instance);
    const res = mockRes();

    await controller.deleteCargoType({ params: { id: '1' } }, res);

    expect(instance.destroy).toHaveBeenCalled();
    expect(res.json.mock.calls[0][0]).toMatchObject({ success: true });
    expect(res.json.mock.calls[0][0].message).toMatch(/Xoá loại hàng thành công/);
  });
});
