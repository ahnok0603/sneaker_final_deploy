import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, OnInit, OnDestroy, AfterViewInit, Renderer2, ChangeDetectorRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Product, ProductService } from '../../myservices/product';
import { Cart } from '../../myservices/cart';

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './homepage.html',
  styleUrl: './homepage.css',
})
export class Homepage implements OnInit, AfterViewInit, OnDestroy {
  lastestProducts: Product[] = [];
  featuredProducts: Product[] = [];

  isLoadingLatest = true;
  isLoadingFeatured = true;
  errorLatest = '';
  errorFeatured = '';

  @ViewChild('contentWrapper') contentWrapper!: ElementRef;
  @ViewChild('heroCrystals') heroCrystals!: ElementRef;

  constructor(
    private productService: ProductService,
    private cartService: Cart,
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef   // ✅ thêm vào đây
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  ngOnDestroy(): void {}

  ngAfterViewInit(): void {
    this.initScrollAnimations();
  }

  loadProducts(): void {
    this.isLoadingLatest = true;
    this.isLoadingFeatured = true;
    this.errorLatest = '';
    this.errorFeatured = '';

    this.productService.getAllProducts().subscribe({
      next: (products) => {
        if (!products || products.length === 0) {
          this.errorLatest = 'No products available';
          this.errorFeatured = 'No products available';
          this.isLoadingLatest = false;
          this.isLoadingFeatured = false;
          this.cdr.detectChanges();  // ✅
          return;
        }
        this.lastestProducts = products.slice(0, 8);
        this.isLoadingLatest = false;

        this.featuredProducts = products.filter(p => p.featured).slice(0, 4);
        if (this.featuredProducts.length === 0) {
          this.featuredProducts = products.slice(0, 4);
        }
        this.isLoadingFeatured = false;

        this.cdr.detectChanges();  // ✅ ép Angular re-render ngay sau khi có data
      },
      error: (err) => {
        this.errorLatest = 'Failed to load products. Please try again.';
        this.errorFeatured = 'Failed to load products. Please try again.';
        this.isLoadingLatest = false;
        this.isLoadingFeatured = false;
        this.lastestProducts = [];
        this.featuredProducts = [];
        this.cdr.detectChanges();  // ✅
      }
    });
  }

  initScrollAnimations(): void {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('animate-active'); });
    }, { threshold: 0.3 });

    if (this.contentWrapper) observer.observe(this.contentWrapper.nativeElement);
    document.querySelectorAll('.lastest-section, .featured-section').forEach(s => observer.observe(s));
    this.initHeroCrystals();
  }

  initHeroCrystals(): void {
    if (!this.heroCrystals) return;
    const container: HTMLElement = this.heroCrystals.nativeElement;

    const configs: [number, number, number, number, number, number, number][] = [
      [8,   6,  46, 25,  39, 0.3, 5.5],
      [14, 12,  30, -15,  0, 0.8, 7.0],
      [6,  19,  22, 40,  55, 1.2, 6.2],
      [30,  8,  38, -30,-16, 0.5, 8.0],
      [5,  73,  54, 15,  29, 0.2, 6.8],
      [11, 79,  32, -20, -6, 0.9, 5.8],
      [8,  89,  58, 35,  50, 0.4, 7.5],
      [24, 93,  40, -10,  4, 1.1, 6.0],
      [48, 93,  50, 50,  65, 0.6, 7.2],
      [60, 86,  28, -40,-25, 1.4, 5.5],
      [73, 73,  64, 20,  36, 0.7, 8.5],
      [78, 61,  34, -25,-10, 0.3, 6.5],
      [20, 56,  26, 60,  74, 1.6, 7.0],
      [34,  5,  38, -45,-30, 1.0, 6.8],
      [68, 10,  44, 30,  45, 0.5, 7.8],
      [56, 26,  24, -35,-20, 1.8, 5.8],
    ];

    const shapes = [
      'polygon(50% 0%, 100% 100%, 0% 100%)',
      'polygon(0% 0%, 100% 0%, 50% 100%)',
      'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
    ];
    const colors = [
      'linear-gradient(135deg, rgba(249,115,22,0.55) 0%, rgba(255,160,80,0.2) 60%, transparent 100%)',
      'linear-gradient(160deg, rgba(255,200,140,0.5) 0%, rgba(249,115,22,0.18) 55%, transparent 100%)',
      'linear-gradient(20deg,  rgba(239,68,68,0.35)  0%, rgba(249,115,22,0.15) 50%, transparent 100%)',
    ];

    configs.forEach(([top, left, size, rot0, rot1, del, dur], i) => {
      const el = this.renderer.createElement('div') as HTMLElement;
      this.renderer.addClass(el, 'hero-crystal');
      const shape = shapes[i % shapes.length];
      const color = colors[i % colors.length];
      el.style.cssText = `
        top:${top}%; left:${left}%;
        width:${size}px; height:${size}px;
        clip-path:${shape};
        background:${color};
        --rot0:${rot0}deg; --rot1:${rot1}deg;
        --fin-del:${del}s; --fin-dur:0.9s;
        --float-del:${del}s; --float-dur:${dur}s;
        --op:${0.55 + (i % 4) * 0.07};
      `;
      container.appendChild(el);
    });
  }

  formatPrice(price: number): string {
    if (!price || isNaN(price)) return '$0';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  }

  generateStarRating(rating: number): string[] {
    const r = rating || 0;
    const full = Math.floor(r);
    const half = r % 1 >= 0.5;
    const stars: string[] = [];
    for (let i = 0; i < full; i++) stars.push('full');
    if (half) stars.push('half');
    while (stars.length < 5) stars.push('empty');
    return stars;
  }

  getStarChar(type: string): string {
    return type === 'full' ? '★' : type === 'half' ? '⯨' : '☆';
  }

  quickAddToCart(productId: string): void {
    const product = [...this.lastestProducts, ...this.featuredProducts].find(p => p._id === productId);
    if (!product) return;

    this.cartService.addItem({
      id: product._id,
      name: product.name,
      price: product.price,
      images: [product.image],
      brand: product.brand,
      category: product.category,
      quantity: 1
    });

    const toast = document.createElement('div');
    toast.textContent = `"${product.name}" added to cart!`;
    toast.style.cssText = `
      position: fixed; top: 20px; right: 20px;
      background: linear-gradient(135deg, #f97316, #ef4444);
      color: white; padding: 1rem 1.5rem;
      border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 9999; font-weight: 500;
    `;
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 2500);
  }

  onVideoError(event: any): void {
    const videoBox = event.target.closest('.video-box');
    if (videoBox) videoBox.style.display = 'none';
  }

  retryLoadProducts(): void {
    this.loadProducts();
  }

  getDiscountPercentage(price: number, originalPrice: number): number {
    if (!originalPrice || originalPrice <= price) return 0;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  }
}