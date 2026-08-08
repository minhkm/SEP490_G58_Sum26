const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Cấu hình Cloudinary từ .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage: lưu thẳng lên Cloudinary, folder riêng cho từng loại log
const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: 'cargoops/logs',          // folder trên Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    public_id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
  }),
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh JPEG, PNG hoặc WebP'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadLogImages = (req, res, next) => {
  upload.array('images', 5)(req, res, (error) => {
    if (!error) return next();

    let message = error.message || 'Không thể tải ảnh lên';
    if (error.code === 'LIMIT_FILE_SIZE') {
      message = 'Mỗi ảnh tải lên không được vượt quá 5 MB';
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Chỉ được tải lên tối đa 5 ảnh';
    }

    return res.status(400).json({ message });
  });
};

module.exports = upload;
module.exports.uploadLogImages = uploadLogImages;
