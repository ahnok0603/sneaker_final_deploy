/**
 * migrate_users.js
 * Chuẩn hóa 18 user cũ (schema cũ) sang schema mới của Mongoose
 *
 * Cách chạy:
 *   node migrate_users.js
 *
 * Yêu cầu: MongoDB đang chạy tại localhost:27017
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME   = 'sneaker_shop_db';

async function migrate() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✅ Kết nối MongoDB thành công\n');

    const db    = client.db(DB_NAME);
    const users = db.collection('users');

    // Lấy tất cả user có field "name" (schema cũ)
    const oldUsers = await users.find({ name: { $exists: true } }).toArray();
    console.log(`📋 Tìm thấy ${oldUsers.length} user cũ cần migrate\n`);

    if (oldUsers.length === 0) {
      console.log('✅ Không có user nào cần migrate.');
      return;
    }

    let successCount = 0;
    let errorCount   = 0;

    for (const user of oldUsers) {
      try {
        // Map "name" → "username" (lấy phần trước @ nếu trùng email)
        const username = user.name;

        // Giữ lại address nếu có
        const phone = user.phone || '';

        const updateResult = await users.updateOne(
          { _id: user._id },
          {
            $set: {
              username:    username,   // ✅ thêm field username
              role:        'user',     // ✅ đổi "customer" → "user"
              phone:       phone,
              dateOfBirth: '',
              gender:      '',
              avatar:      user.avatar || '',
              // Giữ lại address để dùng sau (không xóa)
            },
            $unset: {
              name:       '',   // ✅ xóa field "name" cũ
              isVerified: '',   // ✅ xóa field không dùng
              updatedAt:  '',   // ✅ để Mongoose tự quản lý
              __v:        '',
            }
          }
        );

        if (updateResult.modifiedCount === 1) {
          console.log(`  ✅ ${user.email} → username: "${username}", role: "user"`);
          successCount++;
        } else {
          console.log(`  ⚠️  ${user.email} — không có thay đổi`);
        }
      } catch (err) {
        console.error(`  ❌ ${user.email} — lỗi: ${err.message}`);
        errorCount++;
      }
    }

    console.log('\n========================================');
    console.log(`✅ Thành công : ${successCount} user`);
    console.log(`❌ Lỗi       : ${errorCount} user`);
    console.log('========================================');
    console.log('\n📌 Lưu ý: field "address" được giữ nguyên trong DB.');
    console.log('   Nếu muốn dùng address, hãy thêm vào UserSchema trong index.js:\n');
    console.log('   address: {');
    console.log('     street:  { type: String, default: \'\' },');
    console.log('     city:    { type: String, default: \'\' },');
    console.log('     state:   { type: String, default: \'\' },');
    console.log('     zip:     { type: String, default: \'\' },');
    console.log('     country: { type: String, default: \'Vietnam\' },');
    console.log('   },');

  } catch (err) {
    console.error('❌ Lỗi kết nối:', err.message);
  } finally {
    await client.close();
    console.log('\n🔌 Đã đóng kết nối MongoDB');
  }
}

migrate();