# Sneaker Shop - Hệ Thống Quản Lý Cửa Hàng Giày Sneaker (Advanced Business Web Development)
Dự án này là một hệ thống đầy đủ bao gồm trang web mua sắm cho khách hàng (Client), tích hợp bảng điều khiển quản trị (Admin Dashboard), và hệ thống Backend API (Node.js + MongoDB).

### 🛠️ Công nghệ sử dụng
| Thành phần | Công nghệ |
| :--- | :--- |
| Backend | Node.js, Express 5, MongoDB (Mongoose) |
| Client & Admin | Angular (Tích hợp chung trong cùng một ứng dụng) |
| Xác thực | JWT (jsonwebtoken), bcryptjs |
| Gửi email | Nodemailer (OTP, quên mật khẩu) |
| Lưu trữ file | Multer |

### 🌐 Địa chỉ truy cập

🚀 Bản Deploy (Online)
| Thành phần | URL |
| :--- | :--- |
| Trang Khách Hàng / Quản trị | https://sneaker-final-deploy.vercel.app/ |
| Trang Quản trị (Admin) | https://sneaker-final-deploy.vercel.app/admin |
| API Backend | https://sneaker-final-deploy.onrender.com |

💻 Chạy Local (Máy bộ)
| Ứng dụng | URL |
| :--- | :--- |
| Trang Client & Admin | http://localhost:4200 |
| API Backend | http://localhost:3000 |

### 🔐 Tài khoản thử nghiệm (Admin)
| Tên trường | Giá trị |
| :--- | :--- |
| Tài khoản | adminsneaker@gmail.com |
| Mật khẩu | Admin@123 |

### 📂 Cấu trúc dự án
| Thư mục | Chức năng | Cổng hiển thị |
| :--- | :--- | :--- |
| my-app | Ứng dụng Frontend (Angular) bao gồm cả Client và giao diện Admin | 4200 |
| my-server | Server Backend chính cung cấp API (Node.js/Express + MongoDB) | 3000 |

---

### ⚙️ Yêu cầu hệ thống và Khởi chạy
Đảm bảo MongoDB đang chạy trên máy của bạn (ví dụ: mongodb://127.0.0.1:27017 hoặc URI MongoDB Atlas). Đồng thời có sẵn database cùng collection để lưu thông tin sản phẩm (sneakers) và người dùng (users).

1. Khởi chạy Backend:
```bash
cd Sneaker_final-main/my-server
npm install
npm start
```

2. Khởi chạy Client & Admin (Angular):
```bash
cd Sneaker_final-main/my-app
npm install
npm start
```

---

### 📚 Tổng hợp danh sách API (Tham khảo)
Base URL: https://sneaker-final-deploy.onrender.com

Chú thích:
| Ký hiệu | Ý nghĩa |
| :---: | :--- |
| — | Public, không cần xác thực |
| 🔑 JWT | Yêu cầu Bearer Token của người dùng (Customer) |
| 🔒 Admin| Yêu cầu Token quản trị viên (Admin) |

1. Xác thực & Người dùng
| Method | Endpoint | Mô tả | Auth |
| :--- | :--- | :--- | :---: |
| POST | /api/users/register | Đăng ký tài khoản mới | — |
| POST | /api/users/login | Đăng nhập tài khoản | — |
| POST | /api/users/forgot-password | Gửi email tạo lại mật khẩu mới | — |
| GET | /api/users/profile | Lấy thông tin cá nhân | 🔑 JWT |

2. Quản trị hệ thống (Admin)
Toàn bộ yêu cầu giới hạn cho quyền quản trị viên.
| Method | Endpoint | Mô tả | Auth |
| :--- | :--- | :--- | :---: |
| GET | /api/users | Danh sách toàn bộ người dùng | 🔒 Admin |
| GET | /api/orders | Danh sách toàn bộ đơn hàng hiện có | 🔒 Admin |
| POST | /api/sneakers | Thêm một đôi giày mới vào hệ thống | 🔒 Admin |
| PUT | /api/sneakers/:id | Cập nhật thông tin giày | 🔒 Admin |
| DELETE| /api/sneakers/:id | Nghỉ bán/Xóa một mẫu giày | 🔒 Admin |

3. Sản phẩm (Giày) & Đánh giá
| Method | Endpoint | Mô tả | Auth |
| :--- | :--- | :--- | :---: |
| GET | /api/sneakers | Danh sách sản phẩm hiển thị ra shop | — |
| GET | /api/sneakers/:id | Nhận thông tin chi tiết một đôi giày | — |
| GET | /api/reviews/:productId| Lấy đánh giá của một sản phẩm | — |
| POST | /api/reviews | Gửi đánh giá/Review sản phẩm | 🔑 JWT |

4. Đơn hàng & Giỏ hàng
| Method | Endpoint | Mô tả | Auth |
| :--- | :--- | :--- | :---: |
| GET | /api/cart | Lấy giỏ hàng hiện tại của user | 🔑 JWT |
| POST | /api/cart | Lưu / Cập nhật trạng thái giỏ hàng | 🔑 JWT |
| POST | /api/orders | Tạo hóa đơn/Thanh toán | 🔑 JWT |
| GET | /api/orders/history| Lịch sử mua hàng của user | 🔑 JWT |

---

### 🧪 Hướng dẫn Test API bằng Postman
Để kiểm tra các API yêu cầu xác thực (🔑 JWT hoặc 🔒 Admin), hãy làm theo các bước sau:

1. Lấy Bearer Token:
Sử dụng Method POST với URL đăng nhập: https://sneaker-final-deploy.onrender.com/api/users/login
Trong tab Body, chọn raw và định dạng JSON, nhập tài khoản Admin:
```json
{
  "email": "adminsneaker@gmail.com",
  "password": "Admin@123"
}
```
Gửi Request và sao chép chuỗi mã "token" trả về trong phần Response.

2. Sử dụng Token vào các Request khác:
Chọn request API bạn muốn test.
Chuyển sang tab Authorization.
Tại mục Type, chọn Bearer Token.
Dán chuỗi Token vừa copy vào ô Token rồi ấn Send.

---

### 🚨 Xử lý lỗi thường gặp
| Sự cố | Cách giải quyết |
| :--- | :--- |
| MongoDB connection failed | Đảm bảo MongoDB đã được bật (mongod hoặc Service) hoặc thông tin URI (process.env.MONGO_URI) trong file cấu hình .env Backend là chính xác. |
| Port already in use | Nếu cổng 3000 hoặc 4200 bị dùng, tắt các Node process đang chạy ngầm trên máy bằng Task Manager. |
| Lỗi không gửi được mail reset password | Kiểm tra lại các thông số biến môi trường (Ví dụ EMAIL_USER, EMAIL_PASS) có đang cung cấp đúng App Password của Gmail trong thư mục my-server hay không. |

### 👥 Nhóm thực hiện
| Vị trí | Nội dung điền |
| :--- | :--- |
| Tên nhóm / MSSV | [Điền thông tin nhóm của bạn] |
| Thành viên 1 | [Tên thành viên] |
| Thành viên 2 | [Tên thành viên] |
| Học phần | Advanced Business Web Development |
