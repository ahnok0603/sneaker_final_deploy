// Script đồng bộ rating + reviewCount trong products theo dữ liệu thực từ reviews
// Chạy: node sync_product_ratings.js

const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/sneaker_shop_db')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => { console.error(err); process.exit(1); });

const ReviewSchema = new mongoose.Schema({}, { strict: false });
const Review = mongoose.model('Review', ReviewSchema, 'reviews');

const ProductSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.model('Product', ProductSchema, 'products');

async function sync() {
  const reviews = await Review.find({}).lean();

  // Group ratings theo productId
  const statsMap = {};
  for (const r of reviews) {
    const pid = r.productId.toString();
    if (!statsMap[pid]) statsMap[pid] = [];
    statsMap[pid].push(r.rating);
  }

  const products = await Product.find({}).lean();
  let updated = 0;
  let reset = 0;

  for (const p of products) {
    const pid = p._id.toString();
    const ratings = statsMap[pid];

    if (ratings && ratings.length > 0) {
      // Có review — tính lại rating trung bình
      const avg = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
      await Product.updateOne(
        { _id: p._id },
        { $set: { rating: avg, reviewCount: ratings.length } }
      );
      console.log(`✅ ${p.name}: rating=${avg}, reviewCount=${ratings.length}`);
      updated++;
    } else {
      // Không có review — reset về 0
      await Product.updateOne(
        { _id: p._id },
        { $set: { rating: 0, reviewCount: 0 } }
      );
      console.log(`⬜ ${p.name}: reset về 0`);
      reset++;
    }
  }

  console.log(`\n📊 Kết quả:`);
  console.log(`   Cập nhật rating thực:  ${updated} sản phẩm`);
  console.log(`   Reset về 0:            ${reset} sản phẩm`);
  mongoose.disconnect();
}

sync().catch(console.error);