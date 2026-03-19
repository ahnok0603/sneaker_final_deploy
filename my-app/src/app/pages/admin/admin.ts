import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Auth } from '../../myservices/auth';
import { ProductService, Product } from '../../myservices/product';
import { environment } from '../../../environments/environment';
interface Order {
  _id: string;
  userId: string;
  items?: any[];
  totalAmount: number;
  discountAmount?: number;
  shippingFee?: number;
  status: string;
  paymentMethod: string;
  paymentStatus?: string;
  shippingAddress: { fullName: string; email?: string; phone: string; street?: string; city?: string };
  note?: string;
  createdAt: string;
  // enriched
  user?: { username: string; email: string; avatar?: string };
}

interface AdminUser {
  _id: string;
  username: string;
  email: string;
  phone?: string;
  role?: string;
  avatar?: string;
  createdAt?: string;
}

interface Review {
  _id: string;
  productId: string;
  productName?: string;
  productImage?: string;
  username: string;
  avatar?: string;
  rating: number;
  title?: string;
  comment?: string;
  verified?: boolean;
  createdAt: string;
}

interface RevenueStats {
  byMonth: Record<string, number>;
  topProducts: { _id: string; name: string; image: string; totalQty: number; totalRev: number }[];
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin implements OnInit {
  private apiUrl = environment.apiUrl;

  // ── Layout ──
  sidebarCollapsed = false;
  activeTab: 'dashboard' | 'products' | 'orders' | 'users' | 'reviews' = 'dashboard';
  tabTitles: Record<string, string> = {
    dashboard: 'Dashboard Overview',
    products:  'Product Management',
    orders:    'Order Management',
    users:     'User Management',
    reviews:   'Review Management'
  };

  // ── Admin info ──
  adminName    = '';
  adminInitial = 'A';

  // ── Stats ──
  stats = {
    totalRevenue: 0, totalOrders: 0, totalProducts: 0, totalUsers: 0,
    pendingOrders: 0, confirmedOrders: 0, deliveredOrders: 0, shippingOrders: 0, cancelledOrders: 0, lowStock: 0,
    totalReviews: 0, avgRating: 0
  };

  // ── Donut segments (dynamic) ──
  donutSegments: { color: string; label: string; count: number; dasharray: string; dashoffset: number; pct: number }[] = [];

  // ── Data ──
  allProducts:      Product[]   = [];
  filteredProducts: Product[]   = [];
  allOrders:        Order[]     = [];
  filteredOrders:   Order[]     = [];
  recentOrders:     Order[]     = [];
  allUsers:         AdminUser[] = [];
  filteredUsers:    AdminUser[] = [];
  allReviews:       Review[]    = [];
  filteredReviews:  Review[]    = [];

  // ── Revenue/Analytics ──
  revenueData:    { label: string; value: number; pct: number }[] = [];
  revenueStats:   RevenueStats = { byMonth: {}, topProducts: [] };
  topBrands:      { name: string; count: number; pct: number }[] = [];
  topCategories:  { name: string; count: number; pct: number }[] = [];
  revenueChartData: { label: string; value: number; pct: number }[] = [];
  revenueChartMax = 0;

  // ── Filters ──
  productSearch = '';
  orderFilter   = 'all';
  userSearch    = '';
  reviewSearch  = '';

  // ── Product modal ──
  showProductModal = false;
  editingProduct: Product | null = null;
  productForm = { name: '', brand: '', category: '', gender: '', price: 0, oldPrice: 0, stock: 0, image: '', description: '', featured: false, sizes: [] as number[], colorsInput: '' };
  availableSizes = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 13];
  modalError   = '';
  modalLoading = false;

  // ── Product delete ──
  showDeleteModal  = false;
  deletingProduct: Product | null = null;

  // ── Order detail modal ──
  showOrderModal  = false;
  selectedOrder:  Order | null = null;
  orderModalLoading = false;

  // ── Review delete ──
  showReviewDeleteModal = false;
  deletingReview: Review | null = null;
  reviewModalLoading = false;

  // ── Toast ──
  toastMsg = '';
  toastErr = false;

  // ── Logout modal ──
  showLogoutModal = false;

  constructor(
    private _auth:    Auth,
    private _router:  Router,
    private _http:    HttpClient,
    private _product: ProductService
  ) {}

  ngOnInit(): void {
    const user = this._auth.getUser();
    if (!user || user.role !== 'admin') { this._router.navigate(['/login']); return; }
    this.adminName    = user.username || user.email;
    this.adminInitial = this.adminName.charAt(0).toUpperCase();
    this.loadAll();
  }

  setTab(tab: typeof this.activeTab): void {
    this.activeTab = tab;
    if (tab === 'reviews' && !this.allReviews.length) this.loadReviews();
  }

  logout(): void { this.showLogoutModal = true; }
  confirmLogout(): void { this._auth.logout(); this._router.navigate(['/homepage']); }

  // ─────────────────────────────────────────
  //  LOAD
  // ─────────────────────────────────────────
  loadAll(): void {
    this._product.getAllProducts().subscribe({ next: p => this.processProducts(p) });

    this._http.get<Order[]>(`${this.apiUrl}/orders/admin/all`).subscribe({
      next: o => this.processOrders(o),
      error: (err) => this.showToast(`Failed to load orders (${err.status || 'network error'})`, true)
    });

    this._http.get<AdminUser[]>(`${this.apiUrl}/auth/admin/users`).subscribe({
      next: u => this.processUsers(u)
    });

    // Load on init so Dashboard has full data immediately
    this.loadRevenueStats();
    this.loadReviews();
  }

  processProducts(products: Product[]): void {
    this.allProducts      = products;
    this.filteredProducts = [...products];
    this.stats.totalProducts = products.length;
    this.stats.lowStock      = products.filter(p => p.stock < 10).length;
    this.buildAnalytics(products);
  }

  processOrders(orders: Order[]): void {
    this.allOrders      = orders;
    this.filteredOrders = [...orders];
    this.recentOrders   = orders.slice(0, 8);
    this.stats.totalOrders     = orders.length;
    this.stats.totalRevenue    = orders.filter(o => !['cancelled','failed'].includes(o.status)).reduce((s, o) => s + (o.totalAmount || 0), 0);
    this.stats.pendingOrders   = orders.filter(o => o.status === 'pending').length;
    this.stats.confirmedOrders = orders.filter(o => o.status === 'confirmed').length;
    this.stats.deliveredOrders = orders.filter(o => o.status === 'delivered').length;
    this.stats.shippingOrders  = orders.filter(o => o.status === 'shipping').length;
    this.stats.cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    this.buildRevenueChart(orders);
    this.buildDonut();
  }

  processUsers(users: AdminUser[]): void {
    this.allUsers      = users;
    this.filteredUsers = [...users];
    this.stats.totalUsers = users.length;
  }

  buildRevenueChart(orders: Order[]): void {
    const months = ['Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
    const now = new Date();
    const data = months.map((label, i) => {
      const m = (now.getMonth() - 6 + i + 12) % 12;
      const y = now.getFullYear() - (now.getMonth() - 6 + i < 0 ? 1 : 0);
      const val = orders.filter(o => {
        const d = new Date(o.createdAt);
        return d.getMonth() === m && d.getFullYear() === y && !['cancelled','failed'].includes(o.status);
      }).reduce((s, o) => s + (o.totalAmount || 0), 0);
      return { label, value: val };
    });
    const max = Math.max(...data.map(d => d.value), 1);
    const mapped = data.map(d => ({ ...d, pct: Math.round((d.value / max) * 85) + 5 }));
    this.revenueData = mapped;
    // Also populate revenueChartData & revenueChartMax so Dashboard renders immediately
    this.revenueChartData = mapped;
    this.revenueChartMax  = max;
  }

  buildAnalytics(products: Product[]): void {
    const bm: Record<string, number> = {};
    const cm: Record<string, number> = {};
    for (const p of products) {
      bm[p.brand]    = (bm[p.brand]    || 0) + 1;
      cm[p.category] = (cm[p.category] || 0) + 1;
    }
    const maxB = Math.max(...Object.values(bm), 1);
    this.topBrands = Object.entries(bm).sort((a,b)=>b[1]-a[1]).slice(0,6)
      .map(([name,count])=>({ name, count, pct: Math.round((count/maxB)*100) }));
    const maxC = Math.max(...Object.values(cm), 1);
    this.topCategories = Object.entries(cm).sort((a,b)=>b[1]-a[1]).slice(0,6)
      .map(([name,count])=>({ name, count, pct: Math.round((count/maxC)*100) }));
  }

  buildDonut(): void {
    const C = 2 * Math.PI * 45; // ≈ 282.74
    const total = this.stats.totalOrders || 1;
    const segs = [
      { label: 'Pending',   color: '#f97316', count: this.stats.pendingOrders   },
      { label: 'Confirmed', color: '#3b82f6', count: this.stats.confirmedOrders  },
      { label: 'Shipping',  color: '#8b5cf6', count: this.stats.shippingOrders  },
      { label: 'Delivered', color: '#22c55e', count: this.stats.deliveredOrders  },
      { label: 'Cancelled', color: '#ef4444', count: this.stats.cancelledOrders  },
    ];
    let cum = 0;
    this.donutSegments = segs.map(s => {
      const arc = (s.count / total) * C;
      const offset = +(C - cum).toFixed(2);
      cum += arc;
      return {
        ...s,
        dasharray: `${arc.toFixed(2)} ${(C - arc).toFixed(2)}`,
        dashoffset: offset,
        pct: Math.round((s.count / total) * 100)
      };
    });
  }

  // ─────────────────────────────────────────
  //  FILTERS
  // ─────────────────────────────────────────
  filterProducts(): void {
    const q = this.productSearch.toLowerCase();
    this.filteredProducts = this.allProducts.filter(p =>
      p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
  }

  filterOrders(status: string): void {
    this.orderFilter    = status;
    this.filteredOrders = status === 'all' ? [...this.allOrders]
      : this.allOrders.filter(o => o.status === status);
  }

  filterUsers(): void {
    const q = this.userSearch.toLowerCase();
    this.filteredUsers = this.allUsers.filter(u =>
      u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  }

  filterReviews(): void {
    const q = this.reviewSearch.toLowerCase();
    this.filteredReviews = this.allReviews.filter(r =>
      r.productName?.toLowerCase().includes(q) ||
      r.username?.toLowerCase().includes(q) ||
      r.comment?.toLowerCase().includes(q));
  }

  // ─────────────────────────────────────────
  //  PRODUCT CRUD — gửi JSON (server dùng req.body)
  // ─────────────────────────────────────────
  openAddProduct(): void {
    this.editingProduct   = null;
    this.productForm      = { name:'', brand:'', category:'', gender:'', price:0, oldPrice:0, stock:0, image:'', description:'', featured:false, sizes:[], colorsInput:'' };
    this.modalError       = '';
    this.showProductModal = true;
    this.initRte('');
  }

  editProduct(p: Product): void {
    this.editingProduct = p;
    this.productForm    = { name:p.name, brand:p.brand, category:p.category, gender:(p as any).gender||'', price:p.price, oldPrice:p.oldPrice||0, stock:p.stock, image:p.image, description:p.description, featured:p.featured, sizes:(p as any).sizes||[], colorsInput:((p as any).colors||[]).join(', ') };
    this.modalError       = '';
    this.showProductModal = true;
    this.initRte(p.description || '');
  }

  saveProduct(): void {
    if (!this.productForm.name || !this.productForm.brand || !this.productForm.price) {
      this.modalError = 'Please fill in required fields (name, brand, price).'; return;
    }
    this.modalLoading = true;
    const { colorsInput, sizes, ...rest } = this.productForm;
    const body: any = {
      ...rest,
      sizes: sizes,
      colors: colorsInput ? colorsInput.split(',').map((c: string) => c.trim()).filter(Boolean) : []
    };

    const req = this.editingProduct
      ? this._http.put(`${this.apiUrl}/api/products/${this.editingProduct._id}`, body)
      : this._http.post(`${this.apiUrl}/api/products`, body);

    req.subscribe({
      next: () => {
        this.modalLoading = false; this.closeProductModal();
        this.showToast(this.editingProduct ? 'Product updated!' : 'Product created!');
        this._product.getAllProducts().subscribe(p => this.processProducts(p));
      },
      error: err => { this.modalLoading = false; this.modalError = err.error?.message || 'Failed.'; }
    });
  }

  confirmDelete(p: Product): void  { this.deletingProduct = p; this.showDeleteModal = true; }

  deleteProduct(): void {
    if (!this.deletingProduct) return;
    this.modalLoading = true;
    this._product.deleteProduct(this.deletingProduct._id).subscribe({
      next: () => {
        this.modalLoading = false; this.showDeleteModal = false;
        this.showToast('Product deleted.');
        this._product.getAllProducts().subscribe(p => this.processProducts(p));
      },
      error: () => { this.modalLoading = false; this.showToast('Delete failed.', true); }
    });
  }

  toggleSize(s: number): void {
    const idx = this.productForm.sizes.indexOf(s);
    if (idx > -1) this.productForm.sizes.splice(idx, 1);
    else this.productForm.sizes.push(s);
    this.productForm.sizes.sort((a, b) => a - b);
  }

  closeProductModal(): void {
    this.showProductModal = false; this.editingProduct = null; this.modalError = '';
    setTimeout(() => {
      const el = document.getElementById('rte-editor');
      if (el) el.innerHTML = '';
    }, 0);
  }

  syncRte(event: any): void {
    this.productForm.description = event.target.innerHTML || event.target.innerText || '';
  }

  initRte(value: string = ''): void {
    setTimeout(() => {
      const el = document.getElementById('rte-editor');
      if (el) el.innerHTML = value;
    }, 50);
  }

  // ─────────────────────────────────────────
  //  ORDER DETAIL + STATUS
  // ─────────────────────────────────────────
  viewOrderDetail(order: Order): void {
    this.orderModalLoading = true;
    this.showOrderModal    = true;
    this.selectedOrder     = order;
    this._http.get<Order>(`${this.apiUrl}/orders/admin/${order._id}`).subscribe({
      next: detail => { this.selectedOrder = detail; this.orderModalLoading = false; },
      error: ()    => { this.orderModalLoading = false; }
    });
  }

  updateOrderStatus(order: Order): void {
    this._http.put(`${this.apiUrl}/orders/admin/${order._id}/status`, { status: order.status }).subscribe({
      next: () => this.showToast('Order status updated!'),
      error: () => this.showToast('Update failed.', true)
    });
  }

  // ─────────────────────────────────────────
  //  REVIEWS
  // ─────────────────────────────────────────
  loadReviews(): void {
    this._http.get<Review[]>(`${this.apiUrl}/api/admin/reviews`).subscribe({
      next: r => {
        this.allReviews      = r;
        this.filteredReviews = [...r];
        this.stats.totalReviews = r.length;
        this.stats.avgRating    = r.length
          ? Math.round((r.reduce((s, rv) => s + rv.rating, 0) / r.length) * 10) / 10
          : 0;
      },
      error: () => this.showToast('Failed to load reviews.', true)
    });
  }

  confirmDeleteReview(r: Review): void  { this.deletingReview = r; this.showReviewDeleteModal = true; }

  deleteReview(): void {
    if (!this.deletingReview) return;
    this.reviewModalLoading = true;
    this._http.delete(`${this.apiUrl}/api/admin/reviews/${this.deletingReview._id}`).subscribe({
      next: () => {
        this.reviewModalLoading   = false;
        this.showReviewDeleteModal = false;
        this.showToast('Review deleted.');
        this.loadReviews();
      },
      error: () => { this.reviewModalLoading = false; this.showToast('Delete failed.', true); }
    });
  }

  getStars(rating: number): number[] { return Array(5).fill(0).map((_, i) => i + 1); }

  // ─────────────────────────────────────────
  //  ANALYTICS
  // ─────────────────────────────────────────
  loadRevenueStats(): void {
    this._http.get<RevenueStats>(`${this.apiUrl}/orders/admin/stats/revenue`).subscribe({
      next: s => {
        this.revenueStats = s;
        const entries = Object.entries(s.byMonth).sort(([a],[b])=>a.localeCompare(b)).slice(-7);
        const max = Math.max(...entries.map(([,v])=>v), 1);
        this.revenueChartMax = max;
        this.revenueChartData = entries.map(([k, v]) => ({
          label: k.slice(5), value: v,
          pct: Math.round((v / max) * 85) + 5
        }));
      }
    });
  }

  // ─────────────────────────────────────────
  //  EXPORT CSV
  // ─────────────────────────────────────────
  exportOrdersCSV(): void {
    const rows = [
      ['Order ID','Customer','Phone','Total','Payment','Status','Date'],
      ...this.filteredOrders.map(o => [
        o._id.slice(-6).toUpperCase(),
        o.shippingAddress?.fullName || '',
        o.shippingAddress?.phone    || '',
        o.totalAmount,
        o.paymentMethod,
        o.status,
        this.formatDate(o.createdAt)
      ])
    ];
    this.downloadCSV(rows, 'orders_export.csv');
    this.showToast('Orders exported!');
  }

  exportProductsCSV(): void {
    const rows = [
      ['Name','Brand','Category','Price','Stock','Rating'],
      ...this.allProducts.map(p => [p.name, p.brand, p.category, p.price, p.stock, p.rating])
    ];
    this.downloadCSV(rows, 'products_export.csv');
    this.showToast('Products exported!');
  }

  exportRevenueCSV(): void {
    const rows = [
      ['Month','Revenue'],
      ...Object.entries(this.revenueStats.byMonth).sort().map(([k,v]) => [k, v])
    ];
    this.downloadCSV(rows, 'revenue_export.csv');
    this.showToast('Revenue exported!');
  }

  private downloadCSV(rows: any[][], filename: string): void {
    const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  // ─────────────────────────────────────────
  //  HELPERS
  // ─────────────────────────────────────────
  formatCurrency(n: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
  }

  formatCurrencyShort(n: number): string {
    if (!n) return '$0';
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  }

  formatDate(d: string): string {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  }

  showToast(msg: string, err = false): void {
    this.toastMsg = msg; this.toastErr = err;
    setTimeout(() => { this.toastMsg = ''; }, 3000);
  }
}