// ============================================================
//  SNEAKER STORE — MongoDB Seed Data
//  Collections: users, orders, orderdetails, reviews
//  Run: node seed_all.js
// ============================================================

const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/sneaker_shop_db')
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    seedAll();
  })
  .catch(err => console.error('❌ Connection error:', err));

// ─────────────────────────────────────────────────────────────
//  SCHEMAS
// ─────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  email:       { type: String, required: true, unique: true },
  password:    { type: String, required: true },  // hashed (bcrypt)
  phone:       { type: String, default: '' },
  address:     {
    street:  { type: String, default: '' },
    city:    { type: String, default: '' },
    state:   { type: String, default: '' },
    zip:     { type: String, default: '' },
    country: { type: String, default: '' },
  },
  avatar:      { type: String, default: '' },
  role:        { type: String, enum: ['customer', 'admin'], default: 'customer' },
  isVerified:  { type: Boolean, default: true },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now },
});

const OrderSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:          { type: String, enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'], default: 'pending' },
  totalAmount:     { type: Number, required: true },
  discountAmount:  { type: Number, default: 0 },
  shippingFee:     { type: Number, default: 0 },
  paymentMethod:   { type: String, enum: ['credit_card', 'paypal', 'cod', 'bank_transfer'], default: 'credit_card' },
  paymentStatus:   { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
  shippingAddress: {
    street:  { type: String },
    city:    { type: String },
    state:   { type: String },
    zip:     { type: String },
    country: { type: String },
  },
  note:            { type: String, default: '' },
  createdAt:       { type: Date, default: Date.now },
  updatedAt:       { type: Date, default: Date.now },
});

const OrderDetailSchema = new mongoose.Schema({
  orderId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  productId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName:{ type: String, required: true },
  brand:      { type: String, required: true },
  image:      { type: String, default: '' },
  size:       { type: Number, required: true },
  color:      { type: String, required: true },
  quantity:   { type: Number, required: true, min: 1 },
  unitPrice:  { type: Number, required: true },
  totalPrice: { type: Number, required: true },
});

const ReviewSchema = new mongoose.Schema({
  productId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  rating:     { type: Number, required: true, min: 1, max: 5 },
  title:      { type: String, default: '' },
  comment:    { type: String, default: '' },
  images:     { type: [String], default: [] },
  likes:      { type: Number, default: 0 },
  verified:   { type: Boolean, default: true },  // verified purchase
  createdAt:  { type: Date, default: Date.now },
  updatedAt:  { type: Date, default: Date.now },
});

const User        = mongoose.model('User',        UserSchema,        'users');
const Order       = mongoose.model('Order',       OrderSchema,       'orders');
const OrderDetail = mongoose.model('OrderDetail', OrderDetailSchema, 'orderdetails');
const Review      = mongoose.model('Review',      ReviewSchema,      'reviews');

// Reference product IDs from existing "products" collection
const Product = mongoose.model('Product', new mongoose.Schema({
  name: String, brand: String, price: Number, image: String,
}), 'products');

// ─────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ─────────────────────────────────────────────────────────────
//  USERS  (20 users: 18 customers + 2 admins)
// ─────────────────────────────────────────────────────────────

const usersData = [
  // ── Admins ──────────────────────────────────────────────────
  {
    name: 'Admin System',
    email: 'admin@sneakerstore.com',
    password: '$2b$10$Xk1V1A4oC3RpQ9v2mN7sSOeW8K5YlTzB0jHdFuGqPaL3nCvRyMiWu', // Admin@123
    phone: '0901234567',
    address: { street: '123 Admin St', city: 'Ho Chi Minh City', state: 'HCM', zip: '70000', country: 'Vietnam' },
    avatar: 'https://i.pravatar.cc/150?img=1',
    role: 'admin',
    isVerified: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    name: 'Store Manager',
    email: 'manager@sneakerstore.com',
    password: '$2b$10$Xk1V1A4oC3RpQ9v2mN7sSOeW8K5YlTzB0jHdFuGqPaL3nCvRyMiWu', // Admin@123
    phone: '0901234568',
    address: { street: '456 Manager Ave', city: 'Hanoi', state: 'HN', zip: '10000', country: 'Vietnam' },
    avatar: 'https://i.pravatar.cc/150?img=2',
    role: 'admin',
    isVerified: true,
    createdAt: new Date('2024-01-05'),
  },
  // ── Customers ───────────────────────────────────────────────
  {
    name: 'Nguyen Van An',
    email: 'nguyenvanan@gmail.com',
    password: '$2b$10$Yz2mL9kP0dWqX8uHsT3aTeF6jN4VcBi7rGpQoKlRxMnDwA1eSvJfO', // User@123
    phone: '0912345670',
    address: { street: '10 Le Loi', city: 'Ho Chi Minh City', state: 'HCM', zip: '70000', country: 'Vietnam' },
    avatar: 'https://i.pravatar.cc/150?img=3',
    role: 'customer',
    createdAt: new Date('2024-02-10'),
  },
  {
    name: 'Tran Thi Bich',
    email: 'tranthibich@gmail.com',
    password: '$2b$10$Yz2mL9kP0dWqX8uHsT3aTeF6jN4VcBi7rGpQoKlRxMnDwA1eSvJfO',
    phone: '0923456781',
    address: { street: '25 Nguyen Hue', city: 'Ho Chi Minh City', state: 'HCM', zip: '70000', country: 'Vietnam' },
    avatar: 'https://i.pravatar.cc/150?img=5',
    role: 'customer',
    createdAt: new Date('2024-02-15'),
  },
  {
    name: 'Le Hoang Nam',
    email: 'lehoangnam@gmail.com',
    password: '$2b$10$Yz2mL9kP0dWqX8uHsT3aTeF6jN4VcBi7rGpQoKlRxMnDwA1eSvJfO',
    phone: '0934567892',
    address: { street: '7 Tran Phu', city: 'Da Nang', state: 'DN', zip: '50000', country: 'Vietnam' },
    avatar: 'https://i.pravatar.cc/150?img=7',
    role: 'customer',
    createdAt: new Date('2024-03-01'),
  },
  {
    name: 'Pham Thi Lan',
    email: 'phamthilan@gmail.com',
    password: '$2b$10$Yz2mL9kP0dWqX8uHsT3aTeF6jN4VcBi7rGpQoKlRxMnDwA1eSvJfO',
    phone: '0945678903',
    address: { street: '33 Hoang Dieu', city: 'Hanoi', state: 'HN', zip: '10000', country: 'Vietnam' },
    avatar: 'https://i.pravatar.cc/150?img=9',
    role: 'customer',
    createdAt: new Date('2024-03-10'),
  },
  {
    name: 'Vo Minh Tuan',
    email: 'vominhtuan@gmail.com',
    password: '$2b$10$Yz2mL9kP0dWqX8uHsT3aTeF6jN4VcBi7rGpQoKlRxMnDwA1eSvJfO',
    phone: '0956789014',
    address: { street: '88 Dien Bien Phu', city: 'Ho Chi Minh City', state: 'HCM', zip: '70000', country: 'Vietnam' },
    avatar: 'https://i.pravatar.cc/150?img=11',
    role: 'customer',
    createdAt: new Date('2024-03-20'),
  },
  {
    name: 'Dang Thi Mai',
    email: 'dangthimai@gmail.com',
    password: '$2b$10$Yz2mL9kP0dWqX8uHsT3aTeF6jN4VcBi7rGpQoKlRxMnDwA1eSvJfO',
    phone: '0967890125',
    address: { street: '55 Bach Dang', city: 'Da Nang', state: 'DN', zip: '50000', country: 'Vietnam' },
    avatar: 'https://i.pravatar.cc/150?img=13',
    role: 'customer',
    createdAt: new Date('2024-04-01'),
  },
  {
    name: 'Hoang Van Duc',
    email: 'hoangvanduc@gmail.com',
    password: '$2b$10$Yz2mL9kP0dWqX8uHsT3aTeF6jN4VcBi7rGpQoKlRxMnDwA1eSvJfO',
    phone: '0978901236',
    address: { street: '12 Nguyen Trai', city: 'Hanoi', state: 'HN', zip: '10000', country: 'Vietnam' },
    avatar: 'https://i.pravatar.cc/150?img=15',
    role: 'customer',
    createdAt: new Date('2024-04-10'),
  },
  {
    name: 'Nguyen Thi Thu',
    email: 'nguyenthithu@gmail.com',
    password: '$2b$10$Yz2mL9kP0dWqX8uHsT3aTeF6jN4VcBi7rGpQoKlRxMnDwA1eSvJfO',
    phone: '0989012347',
    address: { street: '19 Le Duan', city: 'Ho Chi Minh City', state: 'HCM', zip: '70000', country: 'Vietnam' },
    avatar: 'https://i.pravatar.cc/150?img=20',
    role: 'customer',
    createdAt: new Date('2024-04-18'),
  },
  {
    name: 'Bui Quoc Hung',
    email: 'buiquochung@gmail.com',
    password: '$2b$10$Yz2mL9kP0dWqX8uHsT3aTeF6jN4VcBi7rGpQoKlRxMnDwA1eSvJfO',
    phone: '0990123458',
    address: { street: '44 Vo Van Tan', city: 'Ho Chi Minh City', state: 'HCM', zip: '70000', country: 'Vietnam' },
    avatar: 'https://i.pravatar.cc/150?img=22',
    role: 'customer',
    createdAt: new Date('2024-05-01'),
  },
  {
    name: 'Do Thi Huong',
    email: 'dothihuong@gmail.com',
    password: '$2b$10$Yz2mL9kP0dWqX8uHsT3aTeF6jN4VcBi7rGpQoKlRxMnDwA1eSvJfO',
    phone: '0901234569',
    address: { street: '77 Ly Thuong Kiet', city: 'Hanoi', state: 'HN', zip: '10000', country: 'Vietnam' },
    avatar: 'https://i.pravatar.cc/150?img=25',
    role: 'customer',
    createdAt: new Date('2024-05-12'),
  },
  {
    name: 'Trinh Van Long',
    email: 'trinhvanlong@gmail.com',
    password: '$2b$10$Yz2mL9kP0dWqX8uHsT3aTeF6jN4VcBi7rGpQoKlRxMnDwA1eSvJfO',
    phone: '0912345671',
    address: { street: '3 Pasteur', city: 'Ho Chi Minh City', state: 'HCM', zip: '70000', country: 'Vietnam' },
    avatar: 'https://i.pravatar.cc/150?img=30',
    role: 'customer',
    createdAt: new Date('2024-05-20'),
  },
  {
    name: 'Mai Thi Ngoc',
    email: 'maithingoc@gmail.com',
    password: '$2b$10$Yz2mL9kP0dWqX8uHsT3aTeF6jN4VcBi7rGpQoKlRxMnDwA1eSvJfO',
    phone: '0923456782',
    address: { street: '60 Cach Mang Thang 8', city: 'Ho Chi Minh City', state: 'HCM', zip: '70000', country: 'Vietnam' },
    avatar: 'https://i.pravatar.cc/150?img=32',
    role: 'customer',
    createdAt: new Date('2024-06-01'),
  },
  {
    name: 'Ly Van Thanh',
    email: 'lyvanthanh@gmail.com',
    password: '$2b$10$Yz2mL9kP0dWqX8uHsT3aTeF6jN4VcBi7rGpQoKlRxMnDwA1eSvJfO',
    phone: '0934567893',
    address: { street: '18 Phan Xich Long', city: 'Ho Chi Minh City', state: 'HCM', zip: '70000', country: 'Vietnam' },
    avatar: 'https://i.pravatar.cc/150?img=35',
    role: 'customer',
    createdAt: new Date('2024-06-15'),
  },
  {
    name: 'Ngo Thi Khanh',
    email: 'ngothikhanh@gmail.com',
    password: '$2b$10$Yz2mL9kP0dWqX8uHsT3aTeF6jN4VcBi7rGpQoKlRxMnDwA1eSvJfO',
    phone: '0945678904',
    address: { street: '9 Nguyen Dinh Chieu', city: 'Da Nang', state: 'DN', zip: '50000', country: 'Vietnam' },
    avatar: 'https://i.pravatar.cc/150?img=40',
    role: 'customer',
    createdAt: new Date('2024-07-01'),
  },
  {
    name: 'Vuong Quang Huy',
    email: 'vuongquanghuy@gmail.com',
    password: '$2b$10$Yz2mL9kP0dWqX8uHsT3aTeF6jN4VcBi7rGpQoKlRxMnDwA1eSvJfO',
    phone: '0956789015',
    address: { street: '22 Hai Ba Trung', city: 'Hanoi', state: 'HN', zip: '10000', country: 'Vietnam' },
    avatar: 'https://i.pravatar.cc/150?img=45',
    role: 'customer',
    createdAt: new Date('2024-07-18'),
  },
  {
    name: 'Chu Thi Loan',
    email: 'chuthiloan@gmail.com',
    password: '$2b$10$Yz2mL9kP0dWqX8uHsT3aTeF6jN4VcBi7rGpQoKlRxMnDwA1eSvJfO',
    phone: '0967890126',
    address: { street: '5 Tran Hung Dao', city: 'Can Tho', state: 'CT', zip: '90000', country: 'Vietnam' },
    avatar: 'https://i.pravatar.cc/150?img=47',
    role: 'customer',
    createdAt: new Date('2024-08-01'),
  },
  {
    name: 'Ta Minh Khoa',
    email: 'taminhkhoa@gmail.com',
    password: '$2b$10$Yz2mL9kP0dWqX8uHsT3aTeF6jN4VcBi7rGpQoKlRxMnDwA1eSvJfO',
    phone: '0978901237',
    address: { street: '38 Nam Ky Khoi Nghia', city: 'Ho Chi Minh City', state: 'HCM', zip: '70000', country: 'Vietnam' },
    avatar: 'https://i.pravatar.cc/150?img=50',
    role: 'customer',
    createdAt: new Date('2024-08-20'),
  },
  {
    name: 'Phan Thi Yen',
    email: 'phanthiyen@gmail.com',
    password: '$2b$10$Yz2mL9kP0dWqX8uHsT3aTeF6jN4VcBi7rGpQoKlRxMnDwA1eSvJfO',
    phone: '0989012348',
    address: { street: '71 Doan Van Bo', city: 'Ho Chi Minh City', state: 'HCM', zip: '70000', country: 'Vietnam' },
    avatar: 'https://i.pravatar.cc/150?img=52',
    role: 'customer',
    createdAt: new Date('2024-09-05'),
  },
];

// ─────────────────────────────────────────────────────────────
//  REVIEW CONTENT TEMPLATES
// ─────────────────────────────────────────────────────────────

const reviewTemplates = {
  5: [
    { title: 'Tuyệt vời!', comment: 'Sản phẩm đúng mô tả, chất lượng rất tốt. Giao hàng nhanh, đóng gói cẩn thận. Tôi rất hài lòng và sẽ mua thêm.' },
    { title: 'Cực kỳ ưng ý', comment: 'Đây là đôi giày đẹp nhất tôi từng mua. Đế êm, form chuẩn, không cần break-in. Xứng đáng 5 sao!' },
    { title: 'Mua lần 3 rồi vẫn thích', comment: 'Chất lượng ổn định qua từng lần mua. Shop tư vấn nhiệt tình, sản phẩm đúng size. Cực kỳ recommended!' },
    { title: 'Hoàn hảo', comment: 'Nhận hàng nhanh hơn dự kiến. Giày đẹp, đi nhẹ, form vừa. Màu sắc y chang ảnh. 5 sao không đủ để nói lên cảm xúc!' },
    { title: 'Chất lượng vượt mong đợi', comment: 'Với mức giá này, chất lượng quá xuất sắc. Đế cao su bám tốt, upper thoáng khí. Sẽ giới thiệu cho bạn bè.' },
  ],
  4: [
    { title: 'Rất tốt', comment: 'Giày đẹp và thoải mái, đúng size. Chỉ tiếc là giao hàng hơi chậm một chút. Nhìn chung vẫn rất hài lòng.' },
    { title: 'Sản phẩm tốt', comment: 'Chất lượng đúng như mô tả. Đế giày êm, mẫu mã đẹp. Trừ 1 sao vì hộp đựng hơi bị móp khi nhận hàng.' },
    { title: 'Đáng mua', comment: 'Form giày chuẩn, chất liệu tốt. Mặc dù giá hơi cao nhưng xứng đáng với chất lượng. Sẽ ủng hộ shop dài dài.' },
    { title: 'Khá hài lòng', comment: 'Giày mang vào cảm giác rất nhẹ và thoải mái. Màu sắc đẹp, đúng mô tả. Sẽ mua thêm model khác.' },
    { title: 'Tốt', comment: 'Nhận hàng nhanh, giày đẹp. Chỉ cần break-in một chút là ngon. Overall rất ổn với mức giá này.' },
  ],
  3: [
    { title: 'Tạm ổn', comment: 'Giày ở mức trung bình. Chất lượng ổn nhưng không nổi bật. Size hơi rộng hơn tôi nghĩ, lần sau sẽ đặt nhỏ hơn.' },
    { title: 'Bình thường', comment: 'Màu sắc hơi khác ảnh một chút dưới ánh đèn thực tế. Chất lượng ở mức chấp nhận được với giá tiền.' },
    { title: 'Chưa ấn tượng lắm', comment: 'Đôi giày mang được nhưng không có gì đặc biệt. Mong shop cải thiện thêm về chất lượng đường may.' },
  ],
  2: [
    { title: 'Thất vọng', comment: 'Màu sắc khác xa so với ảnh. Size không đúng dù tôi đã chọn đúng theo bảng size. Đang liên hệ đổi trả.' },
    { title: 'Không như kỳ vọng', comment: 'Chất lượng không tương xứng với giá tiền. Đường may khá xấu, đế chưa được chắc. Hơi thất vọng.' },
  ],
  1: [
    { title: 'Rất tệ', comment: 'Giày bị lỗi, đường may bung ngay sau 1 tuần sử dụng. Liên hệ shop hỗ trợ rất chậm. Không hài lòng chút nào.' },
    { title: 'Hàng lỗi', comment: 'Nhận hàng mà giày bị lỗi vật liệu, màu sắc lem luốc không đều. Yêu cầu đổi trả ngay lập tức.' },
  ],
};

// ─────────────────────────────────────────────────────────────
//  MAIN SEED FUNCTION
// ─────────────────────────────────────────────────────────────

async function seedAll() {
  try {

    // ── 1. Clear existing data + drop stale indexes ──────────
    console.log('\n🗑️  Clearing old data & dropping stale indexes...');

    // Drop collections entirely to wipe ALL stale indexes from old schemas
    const db = mongoose.connection.db;
    const existingCollections = (await db.listCollections().toArray()).map(c => c.name);

    for (const col of ['users', 'orders', 'orderdetails', 'reviews']) {
      if (existingCollections.includes(col)) {
        await db.collection(col).drop();
        console.log(`   🗑️  Dropped collection: ${col}`);
      }
    }
    console.log('   ✅ All stale indexes removed');

    // ── 2. Fetch existing products ───────────────────────────
    const products = await Product.find({}).lean();
    if (products.length === 0) {
      console.log('\n⚠️  No products found in DB. Please run seed.js first!');
      return mongoose.disconnect();
    }
    console.log(`\n📦 Found ${products.length} existing products`);

    // ── 3. Insert Users ──────────────────────────────────────
    console.log('\n👤 Seeding users...');
    const insertedUsers = await User.insertMany(usersData);
    console.log(`   ✅ Inserted ${insertedUsers.length} users`);

    // Only use customer accounts for orders/reviews
    const customers = insertedUsers.filter(u => u.role === 'customer');

    // ── 4. Insert Orders + OrderDetails ─────────────────────
    console.log('\n🛒 Seeding orders & orderdetails...');

    const orderStatuses  = ['pending', 'confirmed', 'shipped', 'delivered', 'delivered', 'delivered', 'cancelled'];
    const paymentMethods = ['credit_card', 'paypal', 'cod', 'bank_transfer'];
    const paymentStatusMap = {
      pending: 'unpaid', confirmed: 'paid', shipped: 'paid',
      delivered: 'paid', cancelled: 'unpaid', returned: 'refunded',
    };

    let allInsertedOrders   = [];
    let allInsertedDetails  = [];

    // Each customer gets 2–5 orders
    for (const customer of customers) {
      const numOrders = randInt(2, 5);
      for (let o = 0; o < numOrders; o++) {

        const status        = pick(orderStatuses);
        const paymentMethod = pick(paymentMethods);
        const shippingFee   = pick([0, 20, 30, 50]);
        const orderDate     = randomDate(new Date('2024-03-01'), new Date('2025-03-01'));

        // 1–3 products per order
        const numItems = randInt(1, 3);
        const chosenProducts = [];
        const usedIndexes = new Set();
        while (chosenProducts.length < numItems) {
          const idx = randInt(0, products.length - 1);
          if (!usedIndexes.has(idx)) {
            usedIndexes.add(idx);
            chosenProducts.push(products[idx]);
          }
        }

        // Calculate totals
        let subtotal = 0;
        const detailsTemp = chosenProducts.map(p => {
          const qty        = randInt(1, 2);
          const unitPrice  = p.price;
          const totalPrice = unitPrice * qty;
          subtotal += totalPrice;
          return {
            productId:   p._id,
            productName: p.name,
            brand:       p.brand,
            image:       p.image,
            size:        pick([7, 8, 9, 10, 11, 12]),
            color:       pick(['Black/White', 'White', 'Grey', 'Navy', 'Red']),
            quantity:    qty,
            unitPrice,
            totalPrice,
          };
        });

        const discountAmount = subtotal > 200 ? Math.round(subtotal * 0.05) : 0;
        const totalAmount    = subtotal - discountAmount + shippingFee;

        // Create Order
        const [insertedOrder] = await Order.insertMany([{
          userId: customer._id,
          status,
          totalAmount,
          discountAmount,
          shippingFee,
          paymentMethod,
          paymentStatus: paymentStatusMap[status],
          shippingAddress: {
            street:  customer.address.street,
            city:    customer.address.city,
            state:   customer.address.state,
            zip:     customer.address.zip,
            country: customer.address.country,
          },
          note: pick(['', '', '', 'Giao giờ hành chính', 'Gọi trước khi giao', 'Để hàng trước cửa']),
          createdAt: orderDate,
          updatedAt: orderDate,
        }]);

        allInsertedOrders.push(insertedOrder);

        // Create OrderDetails
        const detailDocs = detailsTemp.map(d => ({ ...d, orderId: insertedOrder._id }));
        const insertedDetails = await OrderDetail.insertMany(detailDocs);
        allInsertedDetails.push(...insertedDetails);
      }
    }

    console.log(`   ✅ Inserted ${allInsertedOrders.length} orders`);
    console.log(`   ✅ Inserted ${allInsertedDetails.length} order detail items`);

    // ── 5. Insert Reviews ────────────────────────────────────
    console.log('\n⭐ Seeding reviews...');

    // Only "delivered" orders can have reviews
    const deliveredOrders = allInsertedOrders.filter(o => o.status === 'delivered');

    const reviewDocs = [];
    const reviewedCombos = new Set(); // prevent duplicate (userId + productId)

    for (const order of deliveredOrders) {
      // Get the orderdetails for this order
      const details = allInsertedDetails.filter(d => d.orderId.toString() === order._id.toString());

      // 70% chance the customer leaves a review per product
      for (const detail of details) {
        if (Math.random() < 0.70) {
          const comboKey = `${order.userId}_${detail.productId}`;
          if (reviewedCombos.has(comboKey)) continue;
          reviewedCombos.add(comboKey);

          // Weighted rating: skew toward 4–5 stars
          const ratingWeights = [1, 2, 5, 20, 30]; // index 0=1star … 4=5star
          const totalWeight = ratingWeights.reduce((a, b) => a + b, 0);
          let rand = Math.random() * totalWeight;
          let rating = 1;
          for (let i = 0; i < ratingWeights.length; i++) {
            rand -= ratingWeights[i];
            if (rand <= 0) { rating = i + 1; break; }
          }

          const template = pick(reviewTemplates[rating]);
          const reviewDate = new Date(order.createdAt.getTime() + randInt(3, 14) * 86400000);

          reviewDocs.push({
            productId:  detail.productId,
            userId:     order.userId,
            orderId:    order._id,
            rating,
            title:      template.title,
            comment:    template.comment,
            images:     [],
            likes:      randInt(0, 25),
            verified:   true,
            createdAt:  reviewDate,
            updatedAt:  reviewDate,
          });
        }
      }
    }

    // Also add some non-verified (non-purchase) reviews from customers on random products
    for (let i = 0; i < 30; i++) {
      const customer = pick(customers);
      const product  = pick(products);
      const comboKey = `${customer._id}_${product._id}_extra`;
      if (reviewedCombos.has(comboKey)) continue;
      reviewedCombos.add(comboKey);

      const rating   = pick([4, 4, 5, 5, 5, 3]);
      const template = pick(reviewTemplates[rating]);
      const reviewDate = randomDate(new Date('2024-06-01'), new Date('2025-03-01'));

      reviewDocs.push({
        productId:  product._id,
        userId:     customer._id,
        orderId:    null,
        rating,
        title:      template.title,
        comment:    template.comment,
        images:     [],
        likes:      randInt(0, 10),
        verified:   false,
        createdAt:  reviewDate,
        updatedAt:  reviewDate,
      });
    }

    await Review.insertMany(reviewDocs);
    console.log(`   ✅ Inserted ${reviewDocs.length} reviews`);

    // ── 6. Summary ───────────────────────────────────────────
    console.log('\n══════════════════════════════════════════');
    console.log('📊 SEED COMPLETE — Final Summary:');
    console.log('══════════════════════════════════════════');
    console.log(`   users         → ${insertedUsers.length} docs (2 admin, ${customers.length} customers)`);
    console.log(`   orders        → ${allInsertedOrders.length} docs`);

    const statusCounts = {};
    for (const o of allInsertedOrders) statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    for (const [s, c] of Object.entries(statusCounts))
      console.log(`      └─ ${s.padEnd(12)} → ${c}`);

    console.log(`   orderdetails  → ${allInsertedDetails.length} docs`);
    console.log(`   reviews       → ${reviewDocs.length} docs`);

    const verifiedCount   = reviewDocs.filter(r => r.verified).length;
    const unverifiedCount = reviewDocs.filter(r => !r.verified).length;
    console.log(`      └─ verified     → ${verifiedCount}`);
    console.log(`      └─ unverified   → ${unverifiedCount}`);

    const avgRating = (reviewDocs.reduce((a, r) => a + r.rating, 0) / reviewDocs.length).toFixed(2);
    console.log(`      └─ avg rating   → ${avgRating} ⭐`);
    console.log('══════════════════════════════════════════\n');

  } catch (err) {
    console.error('❌ Seed error:', err);
  } finally {
    mongoose.disconnect();
    console.log('🔌 MongoDB connection closed\n');
  }
}