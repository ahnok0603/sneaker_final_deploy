import { HttpClient } from '@angular/common/http';
import { Injectable, signal, computed } from '@angular/core';
import { Observable, tap, of } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
export interface CartItem {
  fashionId: string;
  name: string;
  image: string;
  brand?: string;
  category?: string;
  price: number;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class Cart {
  private apiUrl = environment.apiUrl;

  private _cartItems = signal<CartItem[]>([]);
  cartItems = this._cartItems.asReadonly();
  cartCount = computed(() => this._cartItems().reduce((sum, i) => sum + i.quantity, 0));
  cartTotal = computed(() => this._cartItems().reduce((sum, i) => sum + i.price * i.quantity, 0));

  constructor(private _http: HttpClient, private _router: Router) {
    if (localStorage.getItem('token')) {
      this.loadCart();
    }
  }

  loadCart(): void {
    if (!localStorage.getItem('token')) {
      this._cartItems.set([]);
      return;
    }
    this._http.get<any>(`${this.apiUrl}/cart`).subscribe({
      next: (cart) => this._cartItems.set(cart.items || []),
      error: () => this._cartItems.set([])
    });
  }

  loadCartAndReturn(): Observable<any> {
    if (!localStorage.getItem('token')) {
      this._cartItems.set([]);
      return of({ items: [] });
    }
    return this._http.get<any>(`${this.apiUrl}/cart`).pipe(
      tap(cart => this._cartItems.set(cart.items || []))
    );
  }

  addToCart(item: {
    fashionId: string;
    name: string;
    image: string;
    brand?: string;
    category?: string;
    price: number;
    quantity?: number;
  }): Observable<any> {
    return this._http.post<any>(`${this.apiUrl}/cart/add`, item).pipe(
      tap(cart => this._cartItems.set(cart.items || []))
    );
  }

  // ── Guard: phải đăng nhập mới add to cart ──
  addItem(item: {
    id: string;
    name: string;
    price: number;
    images: string[];
    brand?: string;
    category?: string;
    selectedSize?: string;
    selectedColor?: string;
    quantity?: number;
  }): void {
    if (!localStorage.getItem('token')) {
      // Chưa đăng nhập → toast thông báo rồi redirect
      this.showLoginToast();
      setTimeout(() => this._router.navigate(['/login']), 1500);
      return;
    }
    const payload = {
      fashionId: item.id,
      name: item.name,
      image: item.images?.[0] || '',
      brand: item.brand || '',
      category: item.category || '',
      price: item.price,
      quantity: item.quantity || 1
    };
    this.addToCart(payload).subscribe();
  }

  private showLoginToast(): void {
    const toast = document.createElement('div');
    toast.textContent = '🔒 Vui lòng đăng nhập để thêm vào giỏ hàng!';
    toast.style.cssText = `
      position: fixed; top: 20px; right: 20px;
      background: #1a1a1a; border: 1px solid #3dbfb0;
      color: #3dbfb0; padding: 1rem 1.5rem;
      border-radius: 4px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      z-index: 9999; font-weight: 500; font-size: 14px;
      font-family: 'DM Sans', sans-serif;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1500);
  }

  updateQuantity(fashionId: string, quantity: number): Observable<any> {
    return this._http.put<any>(`${this.apiUrl}/cart/update`, { fashionId, quantity }).pipe(
      tap(cart => this._cartItems.set(cart.items || []))
    );
  }

  removeItem(fashionId: string): Observable<any> {
    return this._http.delete<any>(`${this.apiUrl}/cart/remove/${fashionId}`).pipe(
      tap(cart => this._cartItems.set(cart.items || []))
    );
  }

  clearCart(): Observable<any> {
    return this._http.delete<any>(`${this.apiUrl}/cart/clear`).pipe(
      tap(() => this._cartItems.set([]))
    );
  }

  createMomoPayment(amount: number, orderInfo: string): Observable<any> {
    return this._http.post<any>(`${this.apiUrl}/momo/create`, { amount, orderInfo });
  }

  confirmMomoPayment(orderId: string, resultCode: string): Observable<any> {
    return this._http.post<any>(`${this.apiUrl}/momo/confirm`, { orderId, resultCode }).pipe(
      tap(res => { if (res.success) this._cartItems.set([]); })
    );
  }
}