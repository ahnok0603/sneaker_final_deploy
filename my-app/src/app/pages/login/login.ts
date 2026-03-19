import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../myservices/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
  // KHÔNG có changeDetection — dùng Default (zone.js tự xử lý)
})
export class Login {
  mode: 'login' | 'register' | 'forgot' = 'login';
  email           = '';
  password        = '';
  confirmPassword = '';
  username        = '';
  errMessage      = '';
  successMessage  = '';
  loading         = false;
  showPw          = false;

  constructor(
    private _auth:   Auth,
    private _router: Router
  ) {
    if (this._auth.isLoggedIn()) this._router.navigate(['/home']);
  }

  switchMode(mode: 'login' | 'register' | 'forgot'): void {
    this.mode            = mode;
    this.password        = '';
    this.confirmPassword = '';
    this.errMessage      = '';
    this.successMessage  = '';
  }

  login(): void {
    this.errMessage = ''; this.successMessage = '';
    if (!this.email || !this.password) { this.errMessage = 'Please fill in all fields.'; return; }
    this.loading = true;
    this._auth.login(this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
        this._router.navigate(this._auth.getUser()?.role === 'admin' ? ['/admin'] : ['/home']);
      },
      error: (err) => {
        this.loading    = false;
        this.errMessage = err.error?.message || 'Incorrect email or password.';
      }
    });
  }

  register(): void {
    this.errMessage = ''; this.successMessage = '';
    if (!this.username || !this.email || !this.password) { this.errMessage = 'Please fill in all fields.'; return; }
    if (this.password.length < 6)               { this.errMessage = 'Password must be at least 6 characters.'; return; }
    if (this.password !== this.confirmPassword) { this.errMessage = 'Passwords do not match.'; return; }
    this.loading = true;
    this._auth.register(this.username, this.email, this.password).subscribe({
      next: () => {
        this.loading        = false;
        this.successMessage = 'Account created! Redirecting to sign in...';
        const savedEmail    = this.email;
        setTimeout(() => {
          this.username = ''; this.email = savedEmail;
          this.password = ''; this.confirmPassword = '';
          this.successMessage = 'Account created! Please sign in.';
          this.mode = 'login';
        }, 2000);
      },
      error: (err) => {
        this.loading    = false;
        this.errMessage = err.error?.message || 'Registration failed. Please try again.';
      }
    });
  }

  forgotPassword(): void {
    this.errMessage = ''; this.successMessage = '';
    if (!this.email) { this.errMessage = 'Please enter your email address.'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) { this.errMessage = 'Please enter a valid email address.'; return; }
    this.loading = true;
    this._auth.forgotPassword(this.email).subscribe({
      next: () => {
        this.loading        = false;
        this.successMessage = `Reset link sent to ${this.email}. Check your inbox.`;
        this.email          = '';
      },
      error: (err) => {
        this.loading    = false;
        this.errMessage = err.error?.message || 'No account found with this email.';
      }
    });
  }
}