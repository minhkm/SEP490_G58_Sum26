const express = require('express');
const { Ship, CrewProfile, Voyage, User } = require('../models');

const router = express.Router();

// Lấy dữ liệu cho Agency Dashboard
router.get('/agency', async (req, res) => {
  try {
    const totalVessels = await Ship.count();
    const totalCrews = await CrewProfile.count();
    
    // Nếu bảng Voyage có trường status, ví dụ 'In Progress', tạm đếm những chuyến đang có
    // Nếu chưa có, tạm đếm tất cả
    const voyagesInProgress = await Voyage.count({ 
      where: { status: 'In Progress' } 
    }).catch(() => Voyage.count()); // Dự phòng lỗi nếu ko có status 'In Progress'
    
    // Pending approvals (giả lập là 0 trước)
    const pendingApprovals = 0;

    // Lấy 4 tàu mới cập nhật nhất
    const recentVessels = await Ship.findAll({
      limit: 4,
      order: [['id', 'DESC']],
      attributes: ['id', 'shipName', 'imoNumber', 'status', 'flag']
    });

    // Không lấy newCrews nữa theo yêu cầu

    res.json({
      totalVessels,
      totalCrews,
      voyagesInProgress,
      pendingApprovals,
      recentVessels
    });
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu Agency Dashboard:', error);
    res.status(500).json({ message: 'Lỗi server khi tải dữ liệu tổng quan.', error: error.message, stack: error.stack });
  }
});

module.exports = router;
