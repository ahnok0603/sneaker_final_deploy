import { Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Cart } from '../../myservices/cart';
import { Auth } from '../../myservices/auth';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  searchQuery = '';
  searchOpen = false;

  userAvatar: string = '';
  userInitial: string = '';

  constructor(
    private _auth: Auth,
    private _cart: Cart,
    private _router: Router
  ) {
    effect(() => {
      const u = this._auth.currentUser();
      this.userAvatar  = u?.avatar || '';
      this.userInitial = u?.username?.charAt(0).toUpperCase()
                      || u?.email?.charAt(0).toUpperCase()
                      || 'U';
    });
  }

  get isLoggedIn(): boolean   { return this._auth.isLoggedIn(); }
  get user(): any             { return this._auth.getUser(); }
  get cartItemCount(): number { return this._cart.cartCount(); }

  goToAccount(): void {
    if (this._auth.isLoggedIn()) {
      this._router.navigate(['/account']);
    } else {
      this._router.navigate(['/login']);
    }
  }

  toggleSearch(): void {
    this.searchOpen = !this.searchOpen;
    if (!this.searchOpen) this.searchQuery = '';
  }

  closeSearch(): void {
    this.searchOpen = false;
    this.searchQuery = '';
  }

  submitSearch(): void {
    if (this.searchQuery.trim()) {
      this._router.navigate(['/shop'], { queryParams: { search: this.searchQuery } });
      this.closeSearch();
    }
  }

  logout(): void {
    this._auth.logout();
    this._router.navigate(['/login']);
  }
}