import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Product, ProductService } from '../../myservices/product';
import { Cart } from '../../myservices/cart';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './shop.html',
  styleUrl: './shop.css',
})
export class Shop implements OnInit, OnDestroy {
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  displayedProducts: Product[] = [];

  searchText = '';
  selectedCategory = 'All';
  selectedSort = 'Filter';
  categories: string[] = ['All'];

  itemsPerPage = 8;
  showingAll = false;
  isLoading = true;

  private readonly FALLBACK_IMAGE =
    `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'><rect width='400' height='400' fill='%23f3f4f6'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='18' fill='%239ca3af'>No Image</text></svg>`;

  bannerSlides = [
    {
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&h=500&fit=crop&q=80',
      title: 'FIND YOUR FIT',
    },
    {
      image: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=1200&h=500&fit=crop&q=80',
      title: 'NEW ARRIVALS',
    },
    {
      image: 'https://images.unsplash.com/photo-1556906781-9a414e2a9c86?w=1400',
      title: 'FIND YOUR FIT',
    }
  ];
  currentSlide = 0;
  private slideInterval: any;
  private paramsSub!: Subscription;

  constructor(
    private productService: ProductService,
    private cartService: Cart,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef  // ✅ thêm
  ) {}

  ngOnInit(): void {
    this.paramsSub = this.route.queryParams.subscribe(params => {
      this.searchText = params['search'] || '';
      this.loadProducts();
    });
    this.startSlider();
  }

  ngOnDestroy(): void {
    if (this.slideInterval) clearInterval(this.slideInterval);
    if (this.paramsSub) this.paramsSub.unsubscribe();
  }

  loadProducts(): void {
    this.isLoading = true;
    this.productService.getAllProducts().subscribe({
      next: (products) => {
        this.allProducts = products;
        const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
        this.categories = ['All', ...cats];
        this.isLoading = false;
        this.applyFilters();
        this.cdr.detectChanges();  // ✅ ép re-render
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error loading products:', err);
        this.cdr.detectChanges();  // ✅
      }
    });
  }

  applyFilters(): void {
    let result = [...this.allProducts];

    if (this.selectedCategory && this.selectedCategory !== 'All') {
      result = result.filter(p => p.category === this.selectedCategory);
    }

    if (this.searchText.trim()) {
      const q = this.searchText.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
    }

    if (this.selectedSort === 'Price: Low to High') {
      result.sort((a, b) => a.price - b.price);
    } else if (this.selectedSort === 'Price: High to Low') {
      result.sort((a, b) => b.price - a.price);
    } else if (this.selectedSort === 'Newest') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    this.filteredProducts = result;
    this.showingAll = false;
    this.displayedProducts = result.slice(0, this.itemsPerPage);
  }

  searchProducts(): void { this.applyFilters(); }
  filterByCategory(cat: string): void { this.selectedCategory = cat; this.applyFilters(); }
  onSortChange(): void { this.applyFilters(); }

  showAll(): void {
    this.showingAll = true;
    this.displayedProducts = [...this.filteredProducts];
  }

  addToCart(product: Product): void {
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
      z-index: 9999; font-weight: 500; font-size: 0.9rem;
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 2500);
  }

  formatPrice(price: number): string {
    if (!price || isNaN(price)) return '$0';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  }

  getStars(rating: number): string[] {
    const full = Math.floor(rating || 0);
    const half = (rating || 0) % 1 >= 0.5;
    const stars: string[] = [];
    for (let i = 0; i < full; i++) stars.push('★');
    if (half) stars.push('⯨');
    while (stars.length < 5) stars.push('☆');
    return stars;
  }

  getProductImage(product: Product): string {
    return product.image || this.FALLBACK_IMAGE;
  }

  onImageError(event: any): void {
    event.target.src = this.FALLBACK_IMAGE;
  }

  startSlider(): void {
    this.slideInterval = setInterval(() => this.nextSlide(), 4000);
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.bannerSlides.length;
  }

  prevSlide(): void {
    this.currentSlide = (this.currentSlide - 1 + this.bannerSlides.length) % this.bannerSlides.length;
  }

  goToSlide(i: number): void {
    this.currentSlide = i;
  }
}