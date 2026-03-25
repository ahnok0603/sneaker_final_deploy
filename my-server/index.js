const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const crypto = require('crypto');
const multer = require('multer');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ✅ Multer: lưu avatar vào memory (base64 rồi lưu vào DB)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Chỉ hỗ trợ file ảnh!'));
  }
});

const JWT_SECRET = 'fashion_secret_key_2025';

// ===== NODEMAILER CONFIG =====
// ⚠️  Thay EMAIL_USER và EMAIL_PASS bằng Gmail + App Password của bạn
// Hướng dẫn lấy App Password: Google Account → Security → 2-Step → App passwords
const EMAIL_USER = 'nhinty1415@gmail.com';       // ← đổi thành email của bạn
const EMAIL_PASS = 'sgro kfom mdif ohns';        // ← App Password 16 ký tự
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:4200';       // ← URL frontend

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: EMAIL_USER, pass: EMAIL_PASS }
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sneaker_shop_db', {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => console.log('✅ Kết nối MongoDB thành công!'))
  .catch(err => console.error('❌ Lỗi kết nối MongoDB:', err.message));

// Reconnect nếu mất kết nối
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected. Retrying...');
  setTimeout(() => mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sneaker_shop_db'), 3000);
});
mongoose.connection.on('error', err => console.error('MongoDB error:', err.message));

// ===== SCHEMAS =====

const UserSchema = new mongoose.Schema({
  username:    { type: String, required: true, unique: true },
  email:       { type: String, required: true, unique: true },
  password:    { type: String, required: true },
  role:        { type: String, enum: ['admin', 'user'], default: 'user' },
  phone:       { type: String, default: '' },
  dateOfBirth: { type: String, default: '' },
  gender:      { type: String, enum: ['male', 'female', 'other', ''], default: '' },
  avatar:      { type: String, default: '' },
  address: {
    street:  { type: String, default: '' },
    city:    { type: String, default: '' },
    state:   { type: String, default: '' },
    zip:     { type: String, default: '' },
    country: { type: String, default: 'Vietnam' },
  },
  status:               { type: String, enum: ['active', 'locked'], default: 'active' },
  customerGroup:        { type: String, enum: ['normal', 'potential', 'vip'], default: 'normal' },
  notes:                { type: String, default: '' },
  createdAt:            { type: Date, default: Date.now },
  resetPasswordToken:   { type: String, default: null },
  resetPasswordExpires: { type: Date,   default: null }
});
const User = mongoose.model('User', UserSchema, 'users');

const ProductSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  brand:       { type: String, required: true },
  category:    { type: String, required: true },
  gender:      { type: String, enum: ['Men', 'Women', 'Unisex', ''], default: '' },
  price:       { type: Number, required: true },
  oldPrice:    { type: Number, default: 0 },
  discount:    { type: Number, default: 0 },
  rating:      { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  image:       { type: String, default: '' },
  description: { type: String, default: '' },
  stock:       { type: Number, default: 0 },
  sizes:       [{ type: Number }],
  colors:      [{ type: String }],
  featured:    { type: Boolean, default: false },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now }
});
const Product = mongoose.model('Product', ProductSchema, 'products');

const CartItemSchema = new mongoose.Schema({
  fashionId: { type: String, required: true },
  name:      { type: String },
  image:     { type: String },
  brand:     { type: String },
  category:  { type: String },
  price:     { type: Number },
  quantity:  { type: Number, default: 1 }
});

const CartSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items:     [CartItemSchema],
  updatedAt: { type: Date, default: Date.now }
});
const Cart = mongoose.model('Cart', CartSchema, 'carts');

const OrderSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  totalAmount:     { type: Number, required: true },
  discountAmount:  { type: Number, default: 0 },
  shippingFee:     { type: Number, default: 0 },
  status:          { type: String, enum: ['pending', 'confirmed', 'shipping', 'delivered', 'returned', 'cancelled', 'paid', 'failed'], default: 'pending' },
  paymentMethod:   { type: String, default: 'cod' },
  paymentStatus:   { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
  shippingAddress: {
    fullName: { type: String, default: '' },
    email:    { type: String, default: '' },
    phone:    { type: String, default: '' },
    street:   { type: String, default: '' },
    city:     { type: String, default: '' },
    state:    { type: String, default: '' },
    zip:      { type: String, default: '' },
    country:  { type: String, default: 'Vietnam' }
  },
  note:        { type: String, default: '' },
  momoOrderId: { type: String },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema, 'orders');

// ── OrderDetail Schema ────────────────────────────────────────────────────
const OrderDetailSchema = new mongoose.Schema({
  orderId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  productId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String },
  brand:       { type: String },
  image:       { type: String },
  size:        { type: mongoose.Schema.Types.Mixed, default: '' },
  color:       { type: String, default: '' },
  quantity:    { type: Number, default: 1 },
  unitPrice:   { type: Number },
  totalPrice:  { type: Number }
});
const OrderDetail = mongoose.model('OrderDetail', OrderDetailSchema, 'orderdetails');

// ── Review Schema ──────────────────────────────────────────────────────────
const ReviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  orderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Order',   required: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  username:  { type: String, required: true },
  avatar:    { type: String, default: '' },
  rating:    { type: Number, required: true, min: 1, max: 5 },
  title:     { type: String, default: '' },
  comment:   { type: String, default: '' },
  likes:     { type: Number, default: 0 },
  verified:  { type: Boolean, default: false },
  images:    [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
// Each user can only review 1 product per order once
ReviewSchema.index({ productId: 1, orderId: 1, userId: 1 }, { unique: true });
const Review = mongoose.model('Review', ReviewSchema, 'reviews');

// ===== MIDDLEWARE =====

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Không có token!' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ message: 'Token không hợp lệ!' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'Không có quyền admin!' });
  next();
};

// ===== AUTH =====

app.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(400).json({ message: 'Username hoặc email đã tồn tại!' });
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashed, role: role || 'user' });
    await user.save();
    res.status(201).json({ message: 'Đăng ký thành công!' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Email không tồn tại!' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Sai mật khẩu!' });
    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET, { expiresIn: '7d' }
    );
    res.json({
      token,
      user: {
        id: user._id, username: user.username, email: user.email,
        role: user.role, avatar: user.avatar || '',
        phone: user.phone || '', dateOfBirth: user.dateOfBirth || '',
        gender: user.gender || '', createdAt: user.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/auth/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Cập nhật profile (username, phone, dateOfBirth, gender, address)
app.put('/auth/update-profile', verifyToken, async (req, res) => {
  try {
    const { username, phone, dateOfBirth, gender, address } = req.body;
    if (!username || !username.trim())
      return res.status(400).json({ message: 'Tên không được để trống!' });
    const exists = await User.findOne({ username, _id: { $ne: req.user.id } });
    if (exists) return res.status(400).json({ message: 'Tên này đã được dùng!' });

    const updateData = {
      username:    username.trim(),
      phone:       phone       || '',
      dateOfBirth: dateOfBirth || '',
      gender:      gender      || '',
    };
    if (address) {
      updateData['address.street']  = address.street  || '';
      updateData['address.city']    = address.city    || '';
      updateData['address.state']   = address.state   || '';
      updateData['address.zip']     = address.zip     || '';
      updateData['address.country'] = address.country || 'Vietnam';
    }

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true }
    ).select('-password');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Upload avatar — lưu base64 vào DB
app.post('/auth/avatar', verifyToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Không có file ảnh!' });

    // Chuyển buffer → base64 data URL
    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: base64 },
      { new: true }
    ).select('-password');

    res.json({ message: 'Cập nhật ảnh thành công!', user: updated, avatarUrl: base64 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Đổi mật khẩu
app.put('/auth/change-password', verifyToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword)
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ!' });
    if (newPassword.length < 6)
      return res.status(400).json({ message: 'Mật khẩu mới tối thiểu 6 ký tự!' });
    const user = await User.findById(req.user.id);
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) return res.status(401).json({ message: 'Mật khẩu hiện tại không đúng!' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Đổi mật khẩu thành công!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Quên mật khẩu — gửi email chứa link reset
app.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Vui lòng nhập email!' });

    const user = await User.findOne({ email });

    // Tạo token ngẫu nhiên 32 bytes, hết hạn sau 15 phút
    const token   = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

    if (user) {
      user.resetPasswordToken   = token;
      user.resetPasswordExpires = expires;
      await user.save();
    }

    const resetLink = `${CLIENT_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
      from:    `"Sneaker Store" <${EMAIL_USER}>`,
      to:      email,
      subject: '🔑 Đặt lại mật khẩu — Sneaker Store',
      html: `
        <div style="font-family:'DM Sans',sans-serif;max-width:520px;margin:auto;background:#0f1320;color:#fff;border-radius:8px;overflow:hidden;">
          <div style="background:#f97316;padding:4px 0;"></div>
          <div style="padding:36px 40px;">
            <h2 style="font-size:22px;letter-spacing:3px;margin-bottom:8px;">SNEAKER STORE</h2>
            <p style="color:rgba(255,255,255,0.6);font-size:14px;margin-bottom:24px;">Đặt lại mật khẩu của bạn</p>
            <p style="font-size:14px;line-height:1.7;color:rgba(255,255,255,0.85);">
              Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>${email}</strong>.<br>
              Link có hiệu lực trong <strong>15 phút</strong>.
            </p>
            <a href="${resetLink}"
               style="display:inline-block;margin-top:28px;padding:14px 32px;background:#f97316;color:#fff;
                      text-decoration:none;font-weight:700;letter-spacing:0.1em;font-size:13px;
                      clip-path:polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px));">
              ĐẶT LẠI MẬT KHẨU
            </a>
            <p style="margin-top:28px;font-size:12px;color:rgba(255,255,255,0.35);">
              Nếu bạn không yêu cầu điều này, hãy bỏ qua email này.<br>
              Mật khẩu của bạn sẽ không thay đổi.
            </p>
          </div>
          <div style="background:#f97316;padding:4px 0;"></div>
        </div>
      `
    });

    res.json({ message: 'Đã gửi link đặt lại mật khẩu đến email của bạn.' });
  } catch (err) {
    console.error('FORGOT PASSWORD ERROR:', err.message);
    res.status(500).json({ message: 'Gửi email thất bại, vui lòng thử lại!' });
  }
});

// ✅ Đặt lại mật khẩu bằng token từ email
app.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
      return res.status(400).json({ message: 'Thiếu thông tin!' });
    if (newPassword.length < 6)
      return res.status(400).json({ message: 'Mật khẩu tối thiểu 6 ký tự!' });

    const user = await User.findOne({
      resetPasswordToken:   token,
      resetPasswordExpires: { $gt: new Date() }  // chưa hết hạn
    });
    if (!user) return res.status(400).json({ message: 'Link không hợp lệ hoặc đã hết hạn!' });

    user.password             = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken   = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===== PRODUCTS =====

app.get('/api/products', async (req, res) => {
  try {
    const { category, brand, minPrice, maxPrice, search, sort } = req.query;
    let filter = {};
    if (category && category !== 'All') filter.category = category;
    if (brand) filter.brand = brand;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (search) filter.name = { $regex: search, $options: 'i' };

    let query = Product.find(filter);
    if (sort === 'Price: Low to High') query = query.sort({ price: 1 });
    else if (sort === 'Price: High to Low') query = query.sort({ price: -1 });
    else if (sort === 'Newest') query = query.sort({ createdAt: -1 });
    else query = query.sort({ createdAt: -1 });

    const products = await query;
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/products/featured/list', async (req, res) => {
  try {
    const products = await Product.find({ featured: true }).limit(8);
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const item = await Product.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Không tìm thấy sản phẩm!' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/products', verifyToken, requireAdmin, async (req, res) => {
  try {
    const body = { ...req.body, updatedAt: new Date() };
    // Parse sizes/colors nếu gửi dưới dạng string
    if (typeof body.sizes === 'string') body.sizes = body.sizes.split(',').map(s => Number(s.trim())).filter(Boolean);
    if (typeof body.colors === 'string') body.colors = body.colors.split(',').map(s => s.trim()).filter(Boolean);
    // Tự tính discount từ price và oldPrice
    if (body.oldPrice && body.price && body.oldPrice > body.price)
      body.discount = Math.round((1 - body.price / body.oldPrice) * 100);
    const product = new Product(body);
    const saved = await product.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/products/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const body = { ...req.body, updatedAt: new Date() };
    if (typeof body.sizes === 'string') body.sizes = body.sizes.split(',').map(s => Number(s.trim())).filter(Boolean);
    if (typeof body.colors === 'string') body.colors = body.colors.split(',').map(s => s.trim()).filter(Boolean);
    if (body.oldPrice && body.price && body.oldPrice > body.price)
      body.discount = Math.round((1 - body.price / body.oldPrice) * 100);
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/products/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa thành công!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===== CART =====

app.get('/cart', verifyToken, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id });
    res.json(cart || { userId: req.user.id, items: [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/cart/add', verifyToken, async (req, res) => {
  try {
    const { fashionId, name, image, brand, category, price, quantity = 1 } = req.body;
    let cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) cart = new Cart({ userId: req.user.id, items: [] });
    const existingIdx = cart.items.findIndex(i => i.fashionId === fashionId);
    if (existingIdx > -1) {
      cart.items[existingIdx].quantity += quantity;
    } else {
      cart.items.push({ fashionId, name, image, brand, category, price, quantity });
    }
    cart.updatedAt = new Date();
    await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/cart/update', verifyToken, async (req, res) => {
  try {
    const { fashionId, quantity } = req.body;
    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) return res.status(404).json({ message: 'Cart không tồn tại!' });
    const idx = cart.items.findIndex(i => i.fashionId === fashionId);
    if (idx === -1) return res.status(404).json({ message: 'Sản phẩm không có trong cart!' });
    if (quantity <= 0) {
      cart.items.splice(idx, 1);
    } else {
      cart.items[idx].quantity = quantity;
    }
    cart.updatedAt = new Date();
    await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/cart/remove/:fashionId', verifyToken, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) return res.status(404).json({ message: 'Cart không tồn tại!' });
    cart.items = cart.items.filter(i => i.fashionId !== req.params.fashionId);
    cart.updatedAt = new Date();
    await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/cart/clear', verifyToken, async (req, res) => {
  try {
    await Cart.findOneAndUpdate({ userId: req.user.id }, { items: [], updatedAt: new Date() });
    res.json({ message: 'Đã xóa cart!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===== MOMO =====

const MOMO_CONFIG = {
  partnerCode: 'MOMO',
  accessKey:   'F8BBA842ECF85',
  secretKey:   'K951B6PE1waDMi640xX08PD3vg6EkVlz',
  endpoint:    'https://test-payment.momo.vn/v2/gateway/api/create',
  redirectUrl: 'http://localhost:4200/checkout?payment=success',
  ipnUrl:      'http://localhost:4200/checkout?payment=success',
};

app.post('/momo/create', verifyToken, async (req, res) => {
  try {
    const { amount, orderInfo, shippingAddress } = req.body;
    const cart = await Cart.findOne({ userId: req.user.id });
    const order = new Order({
      userId:          req.user.id,
      totalAmount:     amount,
      discountAmount:  0,
      shippingFee:     0,
      status:          'pending',
      paymentMethod:   'momo',
      paymentStatus:   'unpaid',
      shippingAddress: shippingAddress ? {
        fullName: shippingAddress.fullName || '',
        email:    shippingAddress.email    || '',
        phone:    shippingAddress.phone    || '',
        street:   shippingAddress.street   || shippingAddress.address || '',
        city:     shippingAddress.city     || '',
        state:    shippingAddress.state    || 'HCM',
        zip:      shippingAddress.zip      || '',
        country:  'Vietnam'
      } : {},
      updatedAt:       new Date()
    });
    await order.save();

    // ✅ Convert USD → VNĐ (tỷ giá cố định 1 USD = 25,000 VNĐ)
    // MoMo sandbox yêu cầu: số nguyên VNĐ, tối thiểu 1,000 VNĐ
    const USD_TO_VND = 25000;
    const amountVND  = Math.round(Number(amount) * USD_TO_VND);
    // Đảm bảo tối thiểu 1,000 VNĐ (MoMo sandbox requirement)
    const amountInt  = Math.max(amountVND, 1000);

    const orderId     = `FASHION_${order._id}`;
    const requestId   = `REQ_${Date.now()}`;
    const requestType = 'payWithMethod';

    const rawSignature = [
      `accessKey=${MOMO_CONFIG.accessKey}`,
      `amount=${amountInt}`,
      `extraData=`,
      `ipnUrl=${MOMO_CONFIG.ipnUrl}`,
      `orderId=${orderId}`,
      `orderInfo=${orderInfo}`,
      `partnerCode=${MOMO_CONFIG.partnerCode}`,
      `redirectUrl=${MOMO_CONFIG.redirectUrl}`,
      `requestId=${requestId}`,
      `requestType=${requestType}`
    ].join('&');

    const signature = crypto
      .createHmac('sha256', MOMO_CONFIG.secretKey)
      .update(rawSignature)
      .digest('hex');

    const body = {
      partnerCode: MOMO_CONFIG.partnerCode,
      accessKey:   MOMO_CONFIG.accessKey,
      requestId, amount: amountInt, orderId, orderInfo,
      redirectUrl: MOMO_CONFIG.redirectUrl,
      ipnUrl:      MOMO_CONFIG.ipnUrl,
      extraData:   '', requestType, signature, lang: 'vi'
    };

    const response = await axios.post(MOMO_CONFIG.endpoint, body);
    if (!response.data.payUrl) {
      return res.status(400).json({ message: response.data.localMessage || 'MoMo từ chối tạo thanh toán' });
    }
    order.momoOrderId = orderId;
    await order.save();
    res.json({ payUrl: response.data.payUrl, orderId });
  } catch (err) {
    console.error('MOMO ERROR:', err.response?.data || err.message);
    res.status(500).json({ message: err.response?.data?.localMessage || err.message });
  }
});

app.post('/momo/confirm', verifyToken, async (req, res) => {
  try {
    const { orderId, resultCode } = req.body;
    const mongoId = orderId.replace('FASHION_', '');
    if (String(resultCode) === '0') {
      await Order.findByIdAndUpdate(mongoId, { status: 'paid', paymentStatus: 'paid', updatedAt: new Date() });
      // Luu orderdetails + tru stock
      const cart = await Cart.findOne({ userId: req.user.id });
      if (cart && cart.items.length > 0) {
        // Tru stock tung san pham khi MoMo xac nhan thanh cong
        for (const item of cart.items) {
          await Product.findByIdAndUpdate(
            item.fashionId,
            { $inc: { stock: -item.quantity }, updatedAt: new Date() }
          );
        }
        const details = cart.items.map(item => ({
          orderId:     mongoId,
          productId:   item.fashionId,
          productName: item.name,
          brand:       item.brand || '',
          image:       item.image || '',
          size:        item.size  || '',
          color:       item.color || '',
          quantity:    item.quantity,
          unitPrice:   item.price,
          totalPrice:  item.price * item.quantity
        }));
        await OrderDetail.insertMany(details);
      }
      await Cart.findOneAndUpdate({ userId: req.user.id }, { items: [], updatedAt: new Date() });
      res.json({ success: true, message: 'Thanh toan thanh cong!' });
    } else {
      await Order.findByIdAndUpdate(mongoId, { status: 'failed', updatedAt: new Date() });
      res.json({ success: false, message: 'Thanh toán thất bại!' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===== ORDERS =====

// POST: Tạo order COD / Credit card
app.post('/orders/create', verifyToken, async (req, res) => {
  try {
    const { paymentMethod, shippingAddress, note } = req.body;
    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart || cart.items.length === 0)
      return res.status(400).json({ message: 'Giỏ hàng trống!' });

    const totalAmount = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    // ✅ Kiểm tra stock trước khi tạo đơn
    for (const item of cart.items) {
      const product = await Product.findById(item.fashionId);
      if (!product) {
        return res.status(404).json({ message: `Sản phẩm "${item.name}" không tồn tại!` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Sản phẩm "${product.name}" chỉ còn ${product.stock} trong kho!`
        });
      }
    }

    const order = new Order({
      userId:          req.user.id,
      totalAmount,
      discountAmount:  0,
      shippingFee:     0,
      status:          'pending',
      paymentMethod:   paymentMethod || 'cod',
      paymentStatus:   'unpaid',
      shippingAddress: shippingAddress ? {
        fullName: shippingAddress.fullName || '',
        email:    shippingAddress.email    || '',
        phone:    shippingAddress.phone    || '',
        street:   shippingAddress.street   || shippingAddress.address || '',
        city:     shippingAddress.city     || '',
        state:    shippingAddress.state    || 'HCM',
        zip:      shippingAddress.zip      || '',
        country:  'Vietnam'
      } : {},
      note:            note || '',
      updatedAt:       new Date()
    });
    await order.save();

    // ✅ Trừ stock sau khi tạo đơn thành công
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(
        item.fashionId,
        { $inc: { stock: -item.quantity }, updatedAt: new Date() }
      );
    }

    // Lưu orderdetails
    const details = cart.items.map(item => ({
      orderId:     order._id,
      productId:   item.fashionId,
      productName: item.name,
      brand:       item.brand || '',
      image:       item.image || '',
      size:        item.size  || '',
      color:       item.color || '',
      quantity:    item.quantity,
      unitPrice:   item.price,
      totalPrice:  item.price * item.quantity
    }));
    await OrderDetail.insertMany(details);

    // Xóa cart
    await Cart.findOneAndUpdate({ userId: req.user.id }, { items: [], updatedAt: new Date() });

    res.status(201).json({ success: true, orderId: order._id, message: 'Đặt hàng thành công!' });
  } catch (err) {
    console.error('ORDER CREATE ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

app.get('/orders/my', verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
    const orderIds = orders.map(o => o._id);
    const details  = await OrderDetail.find({ orderId: { $in: orderIds } }).lean();
    const detailMap = {};
    details.forEach(d => {
      const key = d.orderId.toString();
      if (!detailMap[key]) detailMap[key] = [];
      detailMap[key].push(d);
    });
    const enriched = orders.map(o => ({ ...o, items: detailMap[o._id.toString()] || [] }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===== ORDERS — USER ACTIONS =====

// Cancel order: only allowed when status is 'pending' or 'confirmed'
app.put('/orders/:id/cancel', verifyToken, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user.id });
    if (!order) return res.status(404).json({ message: 'Order not found!' });
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ message: 'Cannot cancel order at this stage.' });
    }
    order.status = 'cancelled';
    await order.save();
    res.json({ message: 'Order cancelled successfully.', order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Return order: only allowed when status is 'delivered'
app.put('/orders/:id/return', verifyToken, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user.id });
    if (!order) return res.status(404).json({ message: 'Order not found!' });
    if (order.status !== 'delivered') {
      return res.status(400).json({ message: 'Can only return delivered orders.' });
    }
    order.status = 'returned';
    await order.save();
    res.json({ message: 'Return request submitted.', order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===== REVIEWS =====

// GET all reviews for a product
app.get('/api/products/:id/reviews', async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.id }).sort({ createdAt: -1 }).lean();

    // Join với User để lấy username + avatar cho các review thiếu field này
    const userIds = [...new Set(reviews.map(r => r.userId?.toString()).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } }).select('_id username avatar').lean();
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    const enriched = reviews.map(r => {
      const uid = r.userId?.toString();
      const user = userMap[uid] || {};
      return {
        ...r,
        username: r.username || user.username || 'Anonymous',
        avatar:   r.avatar   || user.avatar   || '',
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET: check if current user already reviewed a product in a specific order
app.get('/api/products/:productId/reviews/check', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.query;
    if (!orderId) return res.json({ reviewed: false });
    const existing = await Review.findOne({
      productId: req.params.productId,
      orderId,
      userId: req.user.id
    });
    res.json({ reviewed: !!existing, review: existing || null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST: submit a review — ONLY allowed if user has a 'delivered' order containing the product
app.post('/api/products/:id/reviews', verifyToken, async (req, res) => {
  try {
    const { rating, comment, title, orderId } = req.body;

    // 1. Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
    }

    // 2. Check order belongs to user, contains the product, and is 'delivered'
    const order = await Order.findOne({ _id: orderId, userId: req.user.id });
    if (!order) {
      return res.status(403).json({ message: 'Order not found or does not belong to you.' });
    }
    if (order.status !== 'delivered') {
      return res.status(403).json({ message: 'You can only review products from delivered orders.' });
    }
    // Items lưu ở collection orderdetails, không phải order.items
    const hasProduct = await OrderDetail.findOne({ orderId, productId: req.params.id });
    if (!hasProduct) {
      return res.status(403).json({ message: 'This product is not in the specified order.' });
    }

    // 3. Check duplicate review
    const existing = await Review.findOne({ productId: req.params.id, orderId, userId: req.user.id });
    if (existing) {
      return res.status(400).json({ message: 'You have already reviewed this product for this order.' });
    }

    // 4. Fetch user info for username/avatar
    const user = await User.findById(req.user.id).select('username avatar');

    // 5. Save review
    const review = new Review({
      productId: req.params.id,
      orderId,
      userId:   req.user.id,
      username: user.username,
      avatar:   user.avatar || '',
      rating:   Number(rating),
      title:    title || '',
      comment:  comment || '',
      likes:    0,
      verified: true,   // verified vì đã check order delivered
      images:   []
    });
    await review.save();

    // 6. Recalculate product rating average
    const allReviews = await Review.find({ productId: req.params.id });
    const avgRating  = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await Product.findByIdAndUpdate(req.params.id, {
      rating:      Math.round(avgRating * 10) / 10,
      reviewCount: allReviews.length
    });

    res.status(201).json({ message: 'Review submitted successfully!', review });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'You have already reviewed this product.' });
    }
    res.status(500).json({ message: err.message });
  }
});

// ===== ADMIN ENDPOINTS =====

// GET all orders (admin)
app.get('/orders/admin/all', verifyToken, requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET revenue stats (admin) — ⚠️ phải đặt TRƯỚC /orders/admin/:id
app.get('/orders/admin/stats/revenue', verifyToken, requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find({ status: { $nin: ['cancelled', 'failed'] } }).lean();
    // Group by month
    const byMonth = {};
    orders.forEach(o => {
      const key = new Date(o.createdAt).toISOString().slice(0, 7); // YYYY-MM
      byMonth[key] = (byMonth[key] || 0) + (o.totalAmount || 0);
    });
    // Top products from orderdetails
    const topProducts = await OrderDetail.aggregate([
      { $group: { _id: '$productId', name: { $first: '$productName' }, image: { $first: '$image' }, totalQty: { $sum: '$quantity' }, totalRev: { $sum: '$totalPrice' } } },
      { $sort: { totalRev: -1 } },
      { $limit: 5 }
    ]);
    res.json({ byMonth, topProducts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET order detail with items (admin)
app.get('/orders/admin/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const order   = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ message: 'Order not found!' });
    const details = await OrderDetail.find({ orderId: req.params.id }).lean();
    const user    = await User.findById(order.userId).select('username email avatar').lean();
    res.json({ ...order, items: details, user: user || null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update order status (admin)
app.put('/orders/admin/:id/status', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Order not found!' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update order details (admin)
app.put('/orders/admin/:id/details', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { shippingAddress, items, status, paymentStatus } = req.body;
    
    // 1. Update items
    let newItemsTotal = 0;
    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (item._id) {
          const qty = Number(item.quantity) || 1;
          const price = Number(item.unitPrice) || 0;
          const userUpdatedItem = {
            productName: item.productName,
            quantity: qty,
            unitPrice: price,
            totalPrice: qty * price
          };
          await OrderDetail.findByIdAndUpdate(item._id, { $set: userUpdatedItem });
          newItemsTotal += userUpdatedItem.totalPrice;
        }
      }
    }

    // 2. Update order
    const orderToUpdate = await Order.findById(req.params.id);
    if (!orderToUpdate) return res.status(404).json({ message: 'Order not found' });

    if (shippingAddress) {
      if (shippingAddress.fullName !== undefined) orderToUpdate.shippingAddress.fullName = shippingAddress.fullName;
      if (shippingAddress.email !== undefined) orderToUpdate.shippingAddress.email = shippingAddress.email;
      if (shippingAddress.phone !== undefined) orderToUpdate.shippingAddress.phone = shippingAddress.phone;
      if (shippingAddress.street !== undefined) orderToUpdate.shippingAddress.street = shippingAddress.street;
      if (shippingAddress.city !== undefined) orderToUpdate.shippingAddress.city = shippingAddress.city;
    }
    if (status !== undefined) orderToUpdate.status = status;
    if (paymentStatus !== undefined) orderToUpdate.paymentStatus = paymentStatus;
    
    if (items && Array.isArray(items)) {
      orderToUpdate.totalAmount = newItemsTotal + (orderToUpdate.shippingFee || 0) - (orderToUpdate.discountAmount || 0);
    }

    orderToUpdate.updatedAt = new Date();
    await orderToUpdate.save();

    const order = await Order.findById(req.params.id).lean();
    const details = await OrderDetail.find({ orderId: req.params.id }).lean();
    const user = await User.findById(order.userId).select('username email avatar').lean();

    res.json({ ...order, items: details, user: user || null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all users (admin)
app.get('/auth/admin/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update user detail (admin)
app.put('/auth/admin/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { username, email, phone, address, password, status, customerGroup, notes } = req.body;
    const updateData = {};
    if (username) {
      if (!username.trim()) return res.status(400).json({ message: 'Username is required' });
      const exists = await User.findOne({ username: username.trim(), _id: { $ne: req.params.id } });
      if (exists) return res.status(400).json({ message: 'Username này đã được dùng!' });
      updateData.username = username.trim();
    }
    if (email) {
      if (!email.trim()) return res.status(400).json({ message: 'Email is required' });
      const exists = await User.findOne({ email: email.trim(), _id: { $ne: req.params.id } });
      if (exists) return res.status(400).json({ message: 'Email này đã được dùng!' });
      updateData.email = email.trim();
    }

    if (phone !== undefined) updateData.phone = phone;
    if (status !== undefined) updateData.status = status;
    if (customerGroup !== undefined) updateData.customerGroup = customerGroup;
    if (notes !== undefined) updateData.notes = notes;

    if (address) {
      if (address.street !== undefined) updateData['address.street'] = address.street;
      if (address.city !== undefined) updateData['address.city'] = address.city;
      if (address.state !== undefined) updateData['address.state'] = address.state;
      if (address.zip !== undefined) updateData['address.zip'] = address.zip;
      if (address.country !== undefined) updateData['address.country'] = address.country;
    }

    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).select('-password');
    
    if (!updated) return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE user (admin)
app.delete('/auth/admin/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
    res.json({ message: 'Người dùng đã bị xóa!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all reviews (admin)
app.get('/api/admin/reviews', verifyToken, requireAdmin, async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 }).lean();
    // Enrich với product name
    const productIds = [...new Set(reviews.map(r => r.productId?.toString()).filter(Boolean))];
    const products   = await Product.find({ _id: { $in: productIds } }).select('_id name image').lean();
    const prodMap    = {};
    products.forEach(p => { prodMap[p._id.toString()] = p; });
    const enriched = reviews.map(r => ({
      ...r,
      productName:  prodMap[r.productId?.toString()]?.name  || 'Unknown',
      productImage: prodMap[r.productId?.toString()]?.image || ''
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE review (admin)
app.delete('/api/admin/reviews/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found!' });
    // Recalculate product rating
    const remaining = await Review.find({ productId: review.productId });
    const avg = remaining.length
      ? remaining.reduce((s, r) => s + r.rating, 0) / remaining.length
      : 0;
    await Product.findByIdAndUpdate(review.productId, {
      rating:      Math.round(avg * 10) / 10,
      reviewCount: remaining.length
    });
    res.json({ message: 'Review deleted!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log('Server chạy tại port ' + PORT));