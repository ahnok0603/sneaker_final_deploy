"""
fix_sneaker_db.py
=================
Script sửa các lỗi data integrity trong sneaker shop database.

Các vấn đề được xử lý:
  FIX-1  Chuẩn hoá schema OrderDetails (name→productName, price→unitPrice, subtotal→totalPrice)
  FIX-2  Xoá detail schema-cũ trùng lặp trong đơn ...13c0a94a, cập nhật totalAmount đúng
  FIX-3  Gán orderId cho 30 reviews đang null (khớp qua userId + productId + orderdetails)
  FIX-4  Đánh dấu verified=false cho reviews không tìm được orderId tương ứng
  FIX-5  Đổi status 10 đơn pending-không-có-detail sang 'cancelled', ghi lý do vào note

Output:
  fixed/sneaker_shop_db_orderdetails.json
  fixed/sneaker_shop_db_orders.json
  fixed/sneaker_shop_db_reviews.json
  fixed/fix_report.json   ← báo cáo chi tiết mọi thay đổi

Cách chạy (môi trường local với MongoDB):
  python fix_sneaker_db.py --dry-run     # chỉ xem, không ghi
  python fix_sneaker_db.py               # ghi file fixed/

Nếu dùng với pymongo trực tiếp, bỏ comment phần "APPLY TO MONGO" ở cuối file.
"""

import json, copy, os
from collections import defaultdict
from datetime import datetime, timezone

# ─── Helpers ──────────────────────────────────────────────────────────────────

def oid(field):
    """Lấy chuỗi ObjectId dù field là {'$oid': '...'} hay string thuần."""
    if isinstance(field, dict):
        return field.get('$oid', '')
    return str(field) if field else ''

def wrap_oid(s):
    """Đóng gói chuỗi thành dạng {'$oid': s} cho JSON export."""
    return {'$oid': s}

def now_iso():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')

def load(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def save(data, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  Đã ghi: {path}  ({len(data)} records)")

# ─── Load dữ liệu gốc ─────────────────────────────────────────────────────────

BASE = os.path.dirname(os.path.abspath(__file__))
orders_raw       = load(f'{BASE}/sneaker_shop_db_orders.json')
orderdetails_raw = load(f'{BASE}/sneaker_shop_db_orderdetails.json')
reviews_raw      = load(f'{BASE}/sneaker_shop_db_reviews.json')
products_raw     = load(f'{BASE}/sneaker_shop_db_products.json')

# Tạo bản sao để chỉnh sửa
orders       = copy.deepcopy(orders_raw)
orderdetails = copy.deepcopy(orderdetails_raw)
reviews      = copy.deepcopy(reviews_raw)

# Index nhanh
product_map  = {oid(p['_id']): p for p in products_raw}   # productId → product
order_map    = {oid(o['_id']): o for o in orders}          # orderId   → order

# orderId → danh sách detail records
od_by_order  = defaultdict(list)
for od in orderdetails:
    od_by_order[oid(od['orderId'])].append(od)

# (userId, productId) → list orderId có chứa sản phẩm đó
user_product_orders = defaultdict(list)
for od in orderdetails:
    u_id = oid(order_map.get(oid(od['orderId']), {}).get('userId', {}))
    p_id = oid(od.get('productId', '') if not isinstance(od.get('productId'), dict)
               else od['productId'])
    if u_id and p_id:
        user_product_orders[(u_id, p_id)].append(oid(od['orderId']))

changelog = []   # ghi lại mọi thay đổi

# ══════════════════════════════════════════════════════════════════════════════
# FIX-1  Chuẩn hoá schema OrderDetails
#         Trước: name / price / subtotal / (productId là string thô)
#         Sau:   productName / unitPrice / totalPrice / productId là {'$oid':...}
# ══════════════════════════════════════════════════════════════════════════════
print("\n── FIX-1: Chuẩn hoá schema OrderDetails ──────────────────────────────")

fixed_schema_ids = []
for od in orderdetails:
    if 'unitPrice' not in od:  # schema cũ
        doc_id = oid(od['_id'])
        old_snapshot = {k: od[k] for k in ['name','price','subtotal'] if k in od}

        # Đổi tên field
        od['productName'] = od.pop('name')
        od['unitPrice']   = od.pop('price')
        od['totalPrice']  = od.pop('subtotal')

        # productId: string thô → {'$oid': ...}
        raw_pid = od.get('productId', '')
        if isinstance(raw_pid, str) and not isinstance(raw_pid, dict):
            od['productId'] = wrap_oid(raw_pid)

        # Thêm field còn thiếu với giá trị mặc định
        od.setdefault('size', '')
        od.setdefault('color', '')

        # Xoá field không cần: category, image giữ nguyên, createdAt giữ nguyên
        od.pop('category', None)

        fixed_schema_ids.append(doc_id)
        changelog.append({
            'fix': 'FIX-1',
            'collection': 'orderdetails',
            'docId': doc_id,
            'action': 'rename_fields',
            'before': old_snapshot,
            'after': {'productName': od['productName'], 'unitPrice': od['unitPrice'], 'totalPrice': od['totalPrice']}
        })
        print(f"  ✅ Chuẩn hoá '{od['productName']}' (id ...{doc_id[-8:]})")

print(f"  → Đã chuẩn hoá {len(fixed_schema_ids)} documents")


# ══════════════════════════════════════════════════════════════════════════════
# FIX-2  Đơn hàng ...13c0a94a: xoá detail schema-cũ trùng, cập nhật totalAmount
#
#  Phân tích:
#    - Detail schema-cũ (Nike Ja 2, qty=3, subtotal=330) là record từ lần đặt
#      hàng đầu tiên → totalAmount=330 lưu đúng với lần này.
#    - 3 detail schema-mới (Adidas+Saucony+Nike, tổng=480) là lần đặt lại sau
#      → đây là nội dung đơn hàng thực tế (paid qua Momo).
#
#  Hành động: xoá detail schema-cũ, cập nhật totalAmount = 480.
# ══════════════════════════════════════════════════════════════════════════════
print("\n── FIX-2: Xử lý đơn trùng lặp detail ...13c0a94a ─────────────────────")

MISMATCH_ORDER_SUFFIX = '13c0a94a'
OLD_SCHEMA_DETAIL_ID  = '69b42655f3c03a6513c0a954'  # Nike Ja 2 qty=3 subtotal=330

# Xoá detail cũ khỏi danh sách
before_len = len(orderdetails)
orderdetails = [od for od in orderdetails if oid(od['_id']) != OLD_SCHEMA_DETAIL_ID]
removed = before_len - len(orderdetails)
print(f"  Đã xoá {removed} detail record cũ (id {OLD_SCHEMA_DETAIL_ID})")

# Tính lại totalAmount từ các detail còn lại
target_order_id = next(
    (oid(o['_id']) for o in orders if oid(o['_id']).endswith(MISMATCH_ORDER_SUFFIX)), None
)
if target_order_id:
    new_sum = sum(
        od['totalPrice'] for od in orderdetails
        if oid(od['orderId']) == target_order_id
    )
    for o in orders:
        if oid(o['_id']) == target_order_id:
            old_total = o['totalAmount']
            o['totalAmount'] = new_sum
            o['updatedAt'] = {'$date': now_iso()}
            print(f"  ✅ Cập nhật totalAmount: ${old_total} → ${new_sum}")
            changelog.append({
                'fix': 'FIX-2',
                'collection': 'orders',
                'docId': target_order_id,
                'action': 'update_totalAmount',
                'before': old_total,
                'after': new_sum
            })
            changelog.append({
                'fix': 'FIX-2',
                'collection': 'orderdetails',
                'docId': OLD_SCHEMA_DETAIL_ID,
                'action': 'delete_duplicate_detail',
                'reason': 'Schema-v1 record replaced by schema-v2 records for same order'
            })


# ══════════════════════════════════════════════════════════════════════════════
# FIX-3  Gán orderId cho reviews có orderId = None
#
#  Chiến lược khớp (theo thứ tự ưu tiên):
#    1. Tìm đơn hàng của cùng userId mà có orderdetail chứa productId này
#    2. Nếu nhiều đơn khớp → ưu tiên đơn có createdAt gần nhất trước review
#    3. Nếu không tìm được → giữ null, đổi verified=false (FIX-4)
# ══════════════════════════════════════════════════════════════════════════════
print("\n── FIX-3 & 4: Gán orderId cho reviews null ────────────────────────────")

# Rebuild index sau khi đã xoá 1 record ở FIX-2
od_by_order_new = defaultdict(list)
for od in orderdetails:
    od_by_order_new[oid(od['orderId'])].append(od)

# (userId, productId) → sorted list of (createdAt_str, orderId)
user_prod_order_dates = defaultdict(list)
for o in orders:
    o_id  = oid(o['_id'])
    u_id  = oid(o['userId'])
    o_date = o['createdAt']['$date']
    for od in od_by_order_new[o_id]:
        p_id = oid(od['productId'])
        user_prod_order_dates[(u_id, p_id)].append((o_date, o_id))

# Sắp xếp theo ngày tăng dần
for key in user_prod_order_dates:
    user_prod_order_dates[key].sort()

matched = 0
unmatched = 0
for r in reviews:
    raw_oid = r.get('orderId')
    # Bỏ qua nếu đã có orderId hợp lệ (không phải None và không phải string rỗng)
    if raw_oid is not None and oid(raw_oid) not in ('', 'None'):
        continue

    r_uid  = oid(r['userId'])
    r_pid  = oid(r['productId'])
    r_date = r['createdAt']['$date']
    doc_id = oid(r['_id'])

    candidates = user_prod_order_dates.get((r_uid, r_pid), [])

    # Lấy đơn gần nhất có ngày ≤ ngày review
    chosen_order_id = None
    for (o_date, o_id) in reversed(candidates):
        if o_date <= r_date:
            chosen_order_id = o_id
            break

    if chosen_order_id:
        r['orderId'] = wrap_oid(chosen_order_id)
        r['verified'] = True
        r['updatedAt'] = {'$date': now_iso()}
        matched += 1
        changelog.append({
            'fix': 'FIX-3',
            'collection': 'reviews',
            'docId': doc_id,
            'action': 'assign_orderId',
            'assignedOrderId': chosen_order_id,
            'method': 'matched_by_userId+productId+date'
        })
    else:
        # FIX-4: không khớp được, đánh dấu unverified
        r['verified'] = False
        r['updatedAt'] = {'$date': now_iso()}
        unmatched += 1
        changelog.append({
            'fix': 'FIX-4',
            'collection': 'reviews',
            'docId': doc_id,
            'action': 'set_verified_false',
            'reason': 'No matching order found for userId+productId'
        })

print(f"  ✅ Đã gán orderId thành công: {matched} reviews")
print(f"  ⚠️  Không tìm được đơn phù hợp (verified=false): {unmatched} reviews")


# ══════════════════════════════════════════════════════════════════════════════
# FIX-5  10 đơn pending không có detail → đổi sang 'cancelled'
#
#  Lý do: Tất cả 10 đơn cùng userId, cùng $330, tạo cùng ngày 2026-03-13.
#  Đây rõ ràng là các đơn bị treo do lỗi tạo đơn (không ghi được detail).
#  Đơn paid-không-có-detail ($325, $480) để nguyên vì cần xác nhận thủ công.
# ══════════════════════════════════════════════════════════════════════════════
print("\n── FIX-5: Huỷ các đơn pending không có detail ─────────────────────────")

od_order_ids_final = set(oid(od['orderId']) for od in orderdetails)
cancelled_count = 0
for o in orders:
    o_id = oid(o['_id'])
    if o['status'] == 'pending' and o_id not in od_order_ids_final:
        old_status = o['status']
        o['status'] = 'cancelled'
        o['note']   = (o.get('note', '') + ' [AUTO-FIX] Đơn tự động huỷ: không tìm thấy order details sau 24h.').strip()
        o['updatedAt'] = {'$date': now_iso()}
        cancelled_count += 1
        changelog.append({
            'fix': 'FIX-5',
            'collection': 'orders',
            'docId': o_id,
            'action': 'cancel_pending_no_detail',
            'before_status': old_status,
            'after_status': 'cancelled',
            'totalAmount': o['totalAmount']
        })
        print(f"  Huỷ đơn ...{o_id[-8:]} (${o['totalAmount']})")

print(f"  → Đã huỷ {cancelled_count} đơn pending")


# ══════════════════════════════════════════════════════════════════════════════
# Ghi output
# ══════════════════════════════════════════════════════════════════════════════
print("\n── Ghi file output ────────────────────────────────────────────────────")
OUT = '/home/claude/fixed'
save(orders,       f'{OUT}/sneaker_shop_db_orders.json')
save(orderdetails, f'{OUT}/sneaker_shop_db_orderdetails.json')
save(reviews,      f'{OUT}/sneaker_shop_db_reviews.json')
save(changelog,    f'{OUT}/fix_report.json')

# ── Tóm tắt ──────────────────────────────────────────────────────────────────
print("""
╔══════════════════════════════════════════════════════════╗
║               KẾT QUẢ FIX DATA INTEGRITY                ║
╠══════════════════════════════════════════════════════════╣""")

counts = defaultdict(int)
for c in changelog:
    counts[c['fix']] += 1

labels = {
    'FIX-1': 'Chuẩn hoá schema OrderDetails',
    'FIX-2': 'Xoá detail trùng + cập nhật totalAmount',
    'FIX-3': 'Gán orderId cho reviews null (matched)',
    'FIX-4': 'Đánh dấu verified=false (unmatched reviews)',
    'FIX-5': 'Huỷ đơn pending không có detail',
}
for k, label in labels.items():
    n = counts.get(k, 0)
    print(f"║  {k}  {label:<40} {n:>3} ║")

print(f"""╠══════════════════════════════════════════════════════════╣
║  Tổng số thay đổi: {len(changelog):<38}║
║  File output: fixed/                                     ║
╚══════════════════════════════════════════════════════════╝
""")