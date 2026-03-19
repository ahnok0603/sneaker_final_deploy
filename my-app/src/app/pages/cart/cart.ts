import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { CartItem, Cart } from '../../myservices/cart';  // ✅ import đúng cả 2

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class CartPage implements OnInit {
  isLoadingCart = true;

  constructor(
    public cartService: Cart,          // ✅ inject class Cart, không phải interface
    private route: ActivatedRoute,
    private router: Router
  ) {}

  get cartItems(): CartItem[] { return this.cartService.cartItems(); }
  get total(): number { return this.cartService.cartTotal(); }

  ngOnInit(): void {
    this.cartService.loadCartAndReturn().subscribe({
      next: () => this.isLoadingCart = false,
      error: () => this.isLoadingCart = false,
    });

    this.route.queryParams.subscribe(params => {
      if (params['payment'] === 'success' && params['orderId'] && params['resultCode'] !== undefined) {
        this.cartService.confirmMomoPayment(params['orderId'], params['resultCode']).subscribe();
      }
    });
  }

  updateQuantity(item: CartItem, delta: number): void {
    const newQty = item.quantity + delta;
    if (newQty < 1) {
      this.removeItem(item);
    } else {
      this.cartService.updateQuantity(item.fashionId, newQty).subscribe();
    }
  }

  removeItem(item: CartItem): void {
    this.cartService.removeItem(item.fashionId).subscribe();
  }

  clearCart(): void {
    if (!confirm('Remove all items from cart?')) return;
    this.cartService.clearCart().subscribe();
  }

  goToCheckout(): void {
    if (this.cartService.cartTotal() <= 0) return;
    this.router.navigate(['/checkout']);
  }

  formatPrice(price: number): string {
    if (!price || isNaN(price)) return '$0';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  }
}