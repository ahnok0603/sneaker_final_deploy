import { Component, OnInit, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth, UserProfile } from '../../myservices/auth';
import { environment } from '../../../environments/environment';
export type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'review' | 'returned' | 'cancelled' | 'paid' | 'failed';

export interface OrderItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  image?: string;
}

export interface Order {
  _id: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  momoOrderId?: string;
  createdAt: string;
}

type MainTab  = 'profile' | 'password' | 'orders';
type OrderTab = 'all' | 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'review' | 'returned' | 'cancelled';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './account.html',
  styleUrl: './account.css',
  encapsulation: ViewEncapsulation.None,
})
export class Account implements OnInit {
  activeTab: MainTab = 'profile';
  activeOrderTab: OrderTab = 'all';
  sidebarCollapsed = false;

  user: UserProfile | null = null;
  avatarPreview = '';

  editUsername = ''; editPhone = ''; editDob = ''; editGender = '';
  editStreet = ''; editCity = ''; editState = ''; editZip = ''; editCountry = 'Vietnam';
  profileMsg = ''; profileErr = ''; profileLoading = false;

  oldPassword = ''; newPassword = ''; confirmPassword = '';
  showOldPw = false; showNewPw = false;
  passwordMsg = ''; passwordErr = ''; passwordLoading = false;

  orders: Order[] = [];
  ordersLoading = false;
  avatarUploading = false;
  avatarErr = '';

  private readonly API = environment.apiUrl;

  readonly ORDER_TABS: { key: OrderTab; label: string }[] = [
    { key: 'all',       label: 'All' },
    { key: 'pending',   label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'shipping',  label: 'Shipping' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'review',    label: 'Leave Review' },
    { key: 'returned',  label: 'Returned' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  constructor(
    private authService: Auth,
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) { this.router.navigate(['/login']); return; }
    this.loadProfile();
    this.loadOrders();
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token')}` });
  }

  loadProfile(): void {
    this.http.get<UserProfile>(`${this.API}/auth/me`, { headers: this.getHeaders() }).subscribe({
      next: (u) => {
        this.user = u;
        this.editUsername = u.username || ''; this.editPhone = (u as any).phone || '';
        this.editDob = (u as any).dateOfBirth || ''; this.editGender = u.gender || '';
        this.editStreet  = (u as any).address?.street  || '';
        this.editCity    = (u as any).address?.city    || '';
        this.editState   = (u as any).address?.state   || '';
        this.editZip     = (u as any).address?.zip     || '';
        this.editCountry = (u as any).address?.country || 'Vietnam';
        this.avatarPreview = u.avatar || '';
        this.cdr.detectChanges();
      },
      error: () => this.router.navigate(['/login'])
    });
  }

  saveProfile(): void {
    this.profileMsg = ''; this.profileErr = '';
    if (!this.editUsername.trim()) { this.profileErr = 'Username cannot be empty!'; return; }
    this.profileLoading = true;
    this.http.put<any>(`${this.API}/auth/update-profile`,
      {
        username: this.editUsername, phone: this.editPhone,
        dateOfBirth: this.editDob, gender: this.editGender,
        address: {
          street:  this.editStreet,
          city:    this.editCity,
          state:   this.editState,
          zip:     this.editZip,
          country: this.editCountry,
        }
      },
      { headers: this.getHeaders() }
    ).subscribe({
      next: (u) => {
        this.profileLoading = false; this.profileMsg = 'Profile updated successfully!';
        this.user = u; localStorage.setItem('user', JSON.stringify(u));
        setTimeout(() => { this.profileMsg = ''; this.cdr.detectChanges(); }, 3000);
        this.cdr.detectChanges();
      },
      error: (err) => { this.profileLoading = false; this.profileErr = err?.error?.message || 'Update failed!'; this.cdr.detectChanges(); }
    });
  }

  onAvatarChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { this.avatarErr = 'Only image files are supported!'; return; }
    if (file.size > 5 * 1024 * 1024)    { this.avatarErr = 'Image must be under 5MB!'; return; }
    this.avatarErr = ''; this.avatarUploading = true;
    const reader = new FileReader();
    reader.onload = (e) => { this.avatarPreview = e.target?.result as string; this.cdr.detectChanges(); };
    reader.readAsDataURL(file);
    const fd = new FormData();
    fd.append('avatar', file);
    this.http.post<any>(`${this.API}/auth/avatar`, fd,
      { headers: new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token')}` }) }
    ).subscribe({
      next: (res) => {
        this.avatarUploading = false;
        if (res.user) { this.user = res.user; this.avatarPreview = res.user.avatar || this.avatarPreview; localStorage.setItem('user', JSON.stringify(res.user)); }
        this.cdr.detectChanges();
      },
      error: () => { this.avatarUploading = false; this.cdr.detectChanges(); }
    });
  }

  changePassword(): void {
    this.passwordMsg = ''; this.passwordErr = '';
    if (!this.oldPassword || !this.newPassword || !this.confirmPassword) { this.passwordErr = 'Please fill in all fields!'; return; }
    if (this.newPassword.length < 6) { this.passwordErr = 'New password must be at least 6 characters!'; return; }
    if (this.newPassword !== this.confirmPassword) { this.passwordErr = 'Passwords do not match!'; return; }
    this.passwordLoading = true;
    this.http.put<any>(`${this.API}/auth/change-password`,
      { oldPassword: this.oldPassword, newPassword: this.newPassword },
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.passwordLoading = false; this.passwordMsg = 'Password changed successfully!';
        this.oldPassword = this.newPassword = this.confirmPassword = '';
        setTimeout(() => { this.passwordMsg = ''; this.cdr.detectChanges(); }, 3000);
        this.cdr.detectChanges();
      },
      error: (err) => { this.passwordLoading = false; this.passwordErr = err?.error?.message || 'Failed to change password.'; this.cdr.detectChanges(); }
    });
  }

  loadOrders(): void {
    this.ordersLoading = true;
    this.http.get<Order[]>(`${this.API}/orders/my`, { headers: this.getHeaders() }).subscribe({
      next: (orders) => { this.orders = orders; this.ordersLoading = false; this.cdr.detectChanges(); },
      error: () => { this.ordersLoading = false; this.cdr.detectChanges(); }
    });
  }

  // ─── Confirm dialog ───────────────────────────────────────
  confirmDialog: {
    open: boolean;
    title: string;
    message: string;
    icon: 'cancel' | 'return';
    confirmLabel: string;
    confirmColor: string;
    onConfirm: () => void;
  } = {
    open: false, title: '', message: '', icon: 'cancel',
    confirmLabel: 'Confirm', confirmColor: '#ef4444', onConfirm: () => {}
  };

  openConfirm(opts: { title: string; message: string; icon: 'cancel'|'return'; confirmLabel: string; confirmColor: string; onConfirm: () => void }): void {
    this.confirmDialog = { open: true, ...opts };
    this.cdr.detectChanges();
  }

  closeConfirm(): void { this.confirmDialog.open = false; this.cdr.detectChanges(); }

  doConfirm(): void {
    this.confirmDialog.open = false;
    this.confirmDialog.onConfirm();
    this.cdr.detectChanges();
  }

  // ─── Cancel order ─────────────────────────────────────────
  cancelOrder(order: Order): void {
    this.openConfirm({
      title: 'Cancel Order',
      message: `Are you sure you want to cancel order #${order._id.slice(-8).toUpperCase()}?`,
      icon: 'cancel',
      confirmLabel: 'Cancel Order',
      confirmColor: '#ef4444',
      onConfirm: () => {
        this.http.put<any>(`${this.API}/orders/${order._id}/cancel`, {}, { headers: this.getHeaders() })
          .subscribe({
            next: (res) => { order.status = res.order.status; this.cdr.detectChanges(); },
            error: (err) => alert(err?.error?.message || 'Cannot cancel order.')
          });
      }
    });
  }

  // ─── Return order ──────────────────────────────────────────
  returnOrder(order: Order): void {
    this.openConfirm({
      title: 'Return Order',
      message: `Request a return for order #${order._id.slice(-8).toUpperCase()}?`,
      icon: 'return',
      confirmLabel: 'Request Return',
      confirmColor: '#3b82f6',
      onConfirm: () => {
        this.http.put<any>(`${this.API}/orders/${order._id}/return`, {}, { headers: this.getHeaders() })
          .subscribe({
            next: (res) => { order.status = res.order.status; this.cdr.detectChanges(); },
            error: (err) => alert(err?.error?.message || 'Cannot return order.')
          });
      }
    });
  }

  // ─── Review modal ──────────────────────────────────────────
  reviewModal: { open: boolean; order: Order | null; item: any; rating: number; comment: string; loading: boolean; msg: string; err: string } = {
    open: false, order: null, item: null, rating: 0, comment: '', loading: false, msg: '', err: ''
  };

  openReview(order: Order, item: any): void {
    this.reviewModal = { open: true, order, item, rating: 5, comment: '', loading: false, msg: '', err: '' };
  }

  closeReview(): void { this.reviewModal.open = false; }

  setReviewRating(r: number): void { this.reviewModal.rating = r; }

  submitReview(): void {
    const m = this.reviewModal;
    if (!m.rating) { m.err = 'Please select a rating!'; return; }
    m.loading = true; m.err = '';
    this.http.post<any>(
      `${this.API}/api/products/${m.item.productId}/reviews`,
      { rating: m.rating, comment: m.comment, orderId: m.order!._id },
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        m.loading = false; m.msg = 'Review submitted! Thank you.';
        setTimeout(() => { m.open = false; this.cdr.detectChanges(); }, 1800);
        this.cdr.detectChanges();
      },
      error: (err) => { m.loading = false; m.err = err?.error?.message || 'Failed to submit.'; this.cdr.detectChanges(); }
    });
  }

  canCancel(status: string): boolean { return ['pending', 'confirmed'].includes(status); }
  canReturn(status: string): boolean { return status === 'delivered'; }
  canReview(status: string): boolean { return status === 'delivered'; }

  private statusMap: Record<OrderTab, OrderStatus[]> = {
    all:       [],
    pending:   ['pending'],
    confirmed: ['confirmed', 'paid'],
    shipping:  ['shipping'],
    delivered: ['delivered'],
    review:    ['delivered'],
    returned:  ['returned'],
    cancelled: ['cancelled', 'failed'],
  };

  get filteredOrders(): Order[] {
    if (this.activeOrderTab === 'all') return this.orders;
    return this.orders.filter(o => this.statusMap[this.activeOrderTab].includes(o.status));
  }

  countByTab(tab: OrderTab): number {
    if (tab === 'all') return this.orders.length;
    return this.orders.filter(o => this.statusMap[tab].includes(o.status)).length;
  }

  setOrderTab(tab: OrderTab): void { this.activeOrderTab = tab; }
  setTab(tab: MainTab): void { this.activeTab = tab; this.profileMsg = this.profileErr = this.passwordMsg = this.passwordErr = ''; }
  showSignOutConfirm = false;
  confirmLogout(): void { this.showSignOutConfirm = true; }
  logout(): void { this.showSignOutConfirm = false; this.authService.logout(); this.router.navigate(['/login']); }
  toggleSidebar(): void { this.sidebarCollapsed = !this.sidebarCollapsed; }
  getInitials(): string { return (this.user?.username || this.user?.email || 'U').charAt(0).toUpperCase(); }

  getStatusLabel(status: string): string {
    const m: Record<string,string> = { pending:'Pending', confirmed:'Confirmed', paid:'Confirmed', shipping:'Shipping', delivered:'Delivered', returned:'Returned', cancelled:'Cancelled', failed:'Cancelled' };
    return m[status] || status;
  }

  getStatusClass(status: string): string {
    const m: Record<string,string> = { pending:'st-pending', confirmed:'st-confirmed', paid:'st-confirmed', shipping:'st-shipping', delivered:'st-delivered', returned:'st-returned', cancelled:'st-cancelled', failed:'st-cancelled' };
    return m[status] || 'st-pending';
  }

  getPwStrength(): 'weak'|'medium'|'strong' {
    if (this.newPassword.length < 6) return 'weak';
    if (this.newPassword.length < 10) return 'medium';
    return 'strong';
  }

  formatPrice(p: number): string {
    if (!p || isNaN(p)) return '$0';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p);
  }
  formatDate(d: string): string  { return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }
}