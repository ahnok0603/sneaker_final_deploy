import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
// EXPORT interface Product để các component khác có thể import
export interface Product {
  _id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  oldPrice?: number;
  originalPrice?: number;  //
  discount?: number;
  rating: number;
  reviewCount: number;
  image: string;
  description: string;
  stock: number;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  discountPercent?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = environment.apiUrl + '/api/products';

  constructor(private http: HttpClient) { }

  getAllProducts(filters?: {
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    sort?: string;
  }): Observable<Product[]> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.category) params = params.set('category', filters.category);
      if (filters.brand) params = params.set('brand', filters.brand);
      if (filters.minPrice) params = params.set('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params = params.set('maxPrice', filters.maxPrice.toString());
      if (filters.search) params = params.set('search', filters.search);
      if (filters.sort) params = params.set('sort', filters.sort);
    }
    
    return this.http.get<Product[]>(this.apiUrl, { params });
  }

  getProductById(id: string): Observable<Product> {  // ✅ Chỉ định return type là Product
    console.log('🌐 API Call: GET', `${this.apiUrl}/${id}`);
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  createProduct(product: FormData): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, product);
  }

  updateProduct(id: string, product: FormData): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/${id}`, product);
  }

  deleteProduct(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getFeaturedProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/featured/list`);
  }
}