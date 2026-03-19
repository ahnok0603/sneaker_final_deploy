import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth } from '../../myservices/auth';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
  // KHÔNG có changeDetection — zone.js tự xử lý
})
export class ResetPassword implements OnInit {
  token           = '';
  newPassword     = '';
  confirmPassword = '';
  errMessage      = '';
  loading         = false;
  showPw          = false;
  success         = false;
  tokenInvalid    = false;
  pwStrength      = '';

  constructor(
    private _route:  ActivatedRoute,
    private _router: Router,
    private _auth:   Auth
  ) {}

  ngOnInit(): void {
    this.token = this._route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) this.tokenInvalid = true;
  }

  submit(): void {
    this.errMessage = '';
    if (!this.newPassword || !this.confirmPassword) { this.errMessage = 'Please fill in all fields.'; return; }
    if (this.newPassword.length < 6)               { this.errMessage = 'Password must be at least 6 characters.'; return; }
    if (this.newPassword !== this.confirmPassword) { this.errMessage = 'Passwords do not match.'; return; }
    this.loading = true;
    this._auth.resetPassword(this.token, this.newPassword).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        setTimeout(() => this._router.navigate(['/login']), 2500);
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.message || '';
        if (msg.includes('hết hạn') || msg.includes('không hợp lệ') ||
            msg.includes('expired')  || msg.includes('invalid')) {
          this.tokenInvalid = true;
        } else {
          this.errMessage = msg || 'Something went wrong. Please try again.';
        }
      }
    });
  }

  checkStrength(): void {
    const pw = this.newPassword;
    if (!pw) { this.pwStrength = ''; return; }
    const score = [pw.length >= 8, /[A-Z]/.test(pw), /\d/.test(pw), /[^A-Za-z0-9]/.test(pw)]
                  .filter(Boolean).length;
    this.pwStrength = score <= 1 ? 'weak' : score <= 3 ? 'medium' : 'strong';
  }

  goLogin(): void { this._router.navigate(['/login']); }
}