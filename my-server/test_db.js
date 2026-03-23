const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb://localhost:27017/sneaker_shop_db');
  console.log('Connected');
  
  const idStr = process.argv[2] || '69bf4e9277abe9ea4b4ec26d';
  console.log('Querying ID:', idStr);
  
  const order = await mongoose.connection.collection('orders').findOne({
    _id: idStr.length === 24 ? new mongoose.Types.ObjectId(idStr) : idStr
  });
  console.log('Order with ObjectId:', order);
  
  const orderById = await mongoose.connection.collection('orders').findOne({ _id: idStr });
  console.log('Order with string ID:', orderById);

  process.exit();
}
test();
