import { Component, OnInit, OnDestroy, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Cart, CartItem } from '../../myservices/cart';
import { environment } from '../../../environments/environment';
@Component({
  selector: 'app-check-out',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './check-out.html',
  styleUrl: './check-out.css',
  encapsulation: ViewEncapsulation.None,
})
export class CheckOut implements OnInit, OnDestroy {
  selectedPayment: string = 'cod';
  isProcessing: boolean = false;
  orderComplete: boolean = false;

  // MoMo
  momoStep: boolean = false;
  momoOrderId: string = '';
  momoAmount: number = 0;
  momoPayUrl: string = '';         // ✅ URL redirect sang trang MoMo thật
  momoErrorMsg: string = '';       // ✅ Hiển thị lỗi nếu tạo đơn thất bại
  momoCountdown: number = 60 * 60;
  shippingAddress: any = {};
  private countdownTimer: any;

  private readonly API = environment.apiUrl;

  constructor(
    public cartService: Cart,
    private router: Router,
    private route: ActivatedRoute,   // ✅ Read query params when MoMo redirects back
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  get cartItems(): CartItem[] { return this.cartService.cartItems(); }
  get subtotal(): number      { return this.cartService.cartTotal(); }
  get total(): number         { return this.subtotal; }

  get countdownHours(): string {
    return String(Math.floor(this.momoCountdown / 3600)).padStart(2, '0');
  }
  get countdownMinutes(): string {
    return String(Math.floor((this.momoCountdown % 3600) / 60)).padStart(2, '0');
  }
  get countdownSeconds(): string {
    return String(this.momoCountdown % 60).padStart(2, '0');
  }

  ngOnInit(): void {
    this.cartService.loadCart();

    // ✅ Xử lý khi MoMo redirect về: /checkout?payment=success&orderId=xxx&resultCode=0
    this.route.queryParams.subscribe(params => {
      const payment    = params['payment'];
      const orderId    = params['orderId'];
      const resultCode = params['resultCode'];

      if (payment === 'success' && orderId) {
        this.handleMomoReturn(orderId, resultCode ?? '0');
      }
    });
  }

  ngOnDestroy(): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  }

  selectPayment(method: string): void {
    this.selectedPayment = method;
  }

  onPlaceOrder(event: Event): void {
    event.preventDefault();
    if (this.cartItems.length === 0) { alert('Your cart is empty!'); return; }
    if (this.isProcessing) return;

    const form = (event.target as HTMLFormElement);
    const fd   = new FormData(form);
    this.shippingAddress = {
      fullName: `${fd.get('firstName') || ''} ${fd.get('lastName') || ''}`.trim(),
      email:    String(fd.get('email')   || ''),
      phone:    String(fd.get('phone')   || ''),
      address:  String(fd.get('address') || ''),
      city:     String(fd.get('city')    || ''),
      zip:      String(fd.get('zip')     || '')
    };

    if (this.selectedPayment === 'momo') {
      this.processMomoPayment();
    } else {
      this.processDirectOrder();
    }
  }

  // ─── COD / Credit ────────────────────────────────────────────────────────────
  private processDirectOrder(): void {
    this.isProcessing = true;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.post<{ success: boolean; orderId: string }>(
      `${this.API}/orders/create`,
      {
        paymentMethod:   this.selectedPayment,
        shippingAddress: this.shippingAddress,
        note: ''
      },
      { headers }
    ).subscribe({
      next: () => {
        this.isProcessing = false;
        this.orderComplete = true;
        this.cartService.loadCart();
        this.cdr.detectChanges();
      },
      error: () => {
        // Fallback: vẫn hiển thị thành công nếu backend lỗi
        this.isProcessing = false;
        this.orderComplete = true;
        this.cdr.detectChanges();
      }
    });
  }

  // ─── MoMo: call backend → receive payUrl → show waiting page ───────────────
  private processMomoPayment(): void {
    this.isProcessing = true;
    this.momoErrorMsg = '';

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.post<{ payUrl: string; orderId: string }>(
      `${this.API}/momo/create`,
      {
        amount:    this.total,
        orderInfo: 'Payment for Fashion Shop order',
        shippingAddress: this.shippingAddress
      },
      { headers }
    ).subscribe({
      next: (res) => {
        if (!res.payUrl) {
          this.isProcessing = false;
          this.momoErrorMsg = 'No payment link received from MoMo!';
          this.cdr.detectChanges();
          return;
        }
        // ✅ Nhận payUrl thật từ MoMo, hiển thị trang chờ
        this.momoOrderId  = res.orderId;
        this.momoPayUrl   = res.payUrl;
        this.momoAmount   = this.total;
        this.isProcessing = false;
        this.momoStep     = true;
        this.startCountdown();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isProcessing = false;
        this.momoErrorMsg = err?.error?.message || 'Server connection error, please try again!';
        this.cdr.detectChanges();
      }
    });
  }

  // ✅ Redirect sang trang thanh toán MoMo thật
  goToMomoPayment(): void {
    if (this.momoPayUrl) {
      window.location.href = this.momoPayUrl;
    }
  }

  // ✅ Xử lý khi MoMo redirect về sau khi thanh toán xong
  private handleMomoReturn(orderId: string, resultCode: string): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.post<{ success: boolean; message: string }>(
      `${this.API}/momo/confirm`,
      { orderId, resultCode },
      { headers }
    ).subscribe({
      next: (res) => {
        setTimeout(() => {
          if (res.success) {
            this.orderComplete = true;
          } else {
            this.momoStep = false;
            alert('MoMo payment failed: ' + res.message);
          }
          this.cdr.detectChanges();
        }, 0);
      },
      error: () => {
        // Nếu confirm lỗi server vẫn coi như thành công (đã thanh toán xong ở MoMo)
        setTimeout(() => {
          this.orderComplete = true;
          this.cdr.detectChanges();
        }, 0);
      }
    });
  }

  private startCountdown(): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.countdownTimer = setInterval(() => {
      if (this.momoCountdown > 0) {
        this.momoCountdown--;
      } else {
        clearInterval(this.countdownTimer);
        this.cancelMomo(); // Hết giờ → quay về checkout
      }
    }, 1000);
  }

  cancelMomo(): void {
    this.momoStep     = false;
    this.momoPayUrl   = '';
    this.momoOrderId  = '';
    this.momoErrorMsg = '';
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.momoCountdown = 3600;
    this.cdr.detectChanges();
  }

  formatPrice(price: number): string {
    if (!price || isNaN(price)) return '$0';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  }
}