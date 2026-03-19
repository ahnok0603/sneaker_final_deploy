import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule, NavigationEnd } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { Product, ProductService } from '../../myservices/product';
import { Cart } from '../../myservices/cart';
import { environment } from '../../../environments/environment';
export interface Review {
  _id: string;
  userId: string;
  username: string;
  avatar?: string;
  rating: number;
  title?: string;
  comment: string;
  likes?: number;
  verified?: boolean;
  images?: string[];
  createdAt: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnInit, OnDestroy {
  product: Product | null = null;
  relatedProducts: Product[] = [];
  selectedSize: string = '9';
  selectedColor: string = 'black';

  // Reviews
  reviews: Review[] = [];
  reviewsLoading = false;
  newReviewRating = 0;
  hoverRating = 0;
  newReviewTitle = '';
  newReviewComment = '';
  reviewLoading = false;
  reviewMsg = '';
  reviewErr = '';

  private routerSubscription?: Subscription;
  private readonly API = environment.apiUrl;

  sizes = ['7', '8', '9', '10', '11', '12'];

  colors = [
    { name: 'Black', code: '#000000' },
    { name: 'White', code: '#FFFFFF' },
    { name: 'Red',   code: '#FF0000' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private cartService: Cart,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadProductFromRoute();
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.router.url.startsWith('/product/')) {
        this.loadProductFromRoute();
      }
    });
  }

  ngOnDestroy() {
    this.routerSubscription?.unsubscribe();
  }

  private loadProductFromRoute() {
    this.product = null;
    const productId = this.route.snapshot.params['id'];
    if (productId) {
      this.loadProduct(productId);
      this.loadRelatedProducts(productId);
      this.loadReviews(productId);
    } else {
      this.router.navigate(['/shop']);
    }
  }

  get isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token')}` });
  }

  loadProduct(id: string) {
    this.productService.getProductById(id).subscribe({
      next: (product) => {
        this.product = product;
        if (product.oldPrice && !product.originalPrice) {
          this.product!.originalPrice = product.oldPrice;
        }
        this.cdr.detectChanges();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: () => {
        setTimeout(() => this.router.navigate(['/shop']), 1000);
      },
    });
  }

  loadRelatedProducts(currentProductId: string) {
    this.productService.getAllProducts().subscribe({
      next: (products) => {
        const others = products.filter(p => p._id !== currentProductId);
        this.relatedProducts = others.sort(() => Math.random() - 0.5).slice(0, 4);
        this.cdr.detectChanges();
      },
      error: () => { this.relatedProducts = []; },
    });
  }

  // ── Reviews ──────────────────────────────────────────────

  loadReviews(productId: string) {
    this.reviewsLoading = true;
    this.http.get<Review[]>(`${this.API}/api/products/${productId}/reviews`).subscribe({
      next: (reviews) => {
        this.reviews = reviews;
        this.reviewsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.reviews = [];
        this.reviewsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  setReviewRating(n: number) {
    this.newReviewRating = n;
  }

  getRatingLabel(r: number): string {
    return ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][r] || '';
  }

  submitReview() {
    this.reviewMsg = '';
    this.reviewErr = '';
    if (this.newReviewRating === 0) { this.reviewErr = 'Please select a star rating.'; return; }
    if (!this.newReviewComment.trim()) { this.reviewErr = 'Please write a comment.'; return; }

    this.reviewLoading = true;
    const productId = this.route.snapshot.params['id'];

    this.http.post<Review>(
      `${this.API}/api/products/${productId}/reviews`,
      { rating: this.newReviewRating, title: this.newReviewTitle.trim(), comment: this.newReviewComment.trim() },
      { headers: this.getHeaders() }
    ).subscribe({
      next: (review) => {
        this.reviews.unshift(review);
        this.newReviewRating = 0;
        this.newReviewTitle = '';
        this.newReviewComment = '';
        this.reviewLoading = false;
        this.reviewMsg = 'Thank you for your review!';
        setTimeout(() => { this.reviewMsg = ''; this.cdr.detectChanges(); }, 3000);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.reviewLoading = false;
        this.reviewErr = err?.error?.message || 'Failed to submit review.';
        this.cdr.detectChanges();
      }
    });
  }

  getStars(rating: number): string[] {
    const full = Math.round(rating);
    return Array.from({ length: 5 }, (_, i) => i < full ? 'full' : 'empty');
  }

  getProductStars(rating: number): string[] {
    return this.getStars(rating);
  }

  getInitials(name: string): string {
    return (name || 'U').charAt(0).toUpperCase();
  }

  // ── Cart & Nav ────────────────────────────────────────────

  selectSize(size: string) { this.selectedSize = size; }
  selectColor(color: string) { this.selectedColor = color; }

  addToCart() {
    if (!this.product) return;
    this.cartService.addItem({
      id: this.product._id,
      name: this.product.name,
      price: this.product.price,
      images: [this.product.image],
      brand: this.product.brand,
      category: this.product.category,
      selectedSize: this.selectedSize,
      selectedColor: this.selectedColor,
      quantity: 1,
    });

    const toast = document.createElement('div');
    toast.textContent = `"${this.product.name}" added to cart!`;
    toast.style.cssText = `
      position: fixed; top: 20px; right: 20px;
      background: linear-gradient(135deg, #f97316, #ef4444);
      color: white; padding: 1rem 1.5rem;
      border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 9999; font-weight: 500; font-size: 14px;
    `;
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 2500);
  }

  addRelatedToCart(product: Product): void {
    this.cartService.addItem({
      id: product._id,
      name: product.name,
      price: product.price,
      images: [product.image],
      brand: product.brand,
      category: product.category,
      quantity: 1,
    });
    const toast = document.createElement('div');
    toast.textContent = `"${product.name}" added to cart!`;
    toast.style.cssText = `
      position: fixed; top: 20px; right: 20px;
      background: linear-gradient(135deg, #f97316, #ef4444);
      color: white; padding: 1rem 1.5rem;
      border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 9999; font-weight: 500; font-size: 14px;
    `;
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 2500);
  }

  backToShop() { this.router.navigate(['/shop']); }

  formatPrice(price: number): string {
    if (!price || isNaN(price)) return '$0';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}