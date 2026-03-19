import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const SESSION_KEY         = 'contact_submitted_at';
const DISPLAY_DURATION_MS = 5000;

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact implements OnInit, OnDestroy {

  isSubmitting  = false;
  submitSuccess = false;
  submitError   = false;

  private clearTimer: ReturnType<typeof setTimeout> | null = null;

  // ✅ Inject HttpClient thay vì dùng fetch
  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    window.scrollTo(0, 0);

    const sentAt = sessionStorage.getItem(SESSION_KEY);
    if (sentAt) {
      const elapsed   = Date.now() - Number(sentAt);
      const remaining = DISPLAY_DURATION_MS - elapsed;
      if (remaining > 0) {
        this.submitSuccess = true;
        this.clearTimer = setTimeout(() => this.clearSuccess(), remaining);
      } else {
        sessionStorage.removeItem(SESSION_KEY);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.clearTimer) clearTimeout(this.clearTimer);
  }

  onSubmit(event: Event): void {
    event.preventDefault();

    if (this.isSubmitting) return;

    const form     = event.target as HTMLFormElement;
    const formData = new FormData(form);

    const payload = {
      access_key: '0792be54-8b8d-48b6-8be0-41847e4b5b22',
      name:    formData.get('name')    as string,
      company: formData.get('company') as string,
      phone:   formData.get('phone')   as string,
      email:   formData.get('email')   as string,
      subject: formData.get('subject') as string,
      message: formData.get('message') as string,
    };

    this.isSubmitting  = true;
    this.submitSuccess = false;
    this.submitError   = false;

    // ✅ HttpClient chạy trong Angular Zone — UI tự update không cần NgZone
    this.http.post<any>('https://api.web3forms.com/submit', payload).subscribe({
      next: (result) => {
        this.isSubmitting = false;
        if (result.success) {
          this.submitSuccess = true;
          form.reset();
          sessionStorage.setItem(SESSION_KEY, String(Date.now()));
          this.clearTimer = setTimeout(() => this.clearSuccess(), DISPLAY_DURATION_MS);
        } else {
          this.submitError = true;
        }
      },
      error: () => {
        this.isSubmitting = false;
        this.submitError  = true;
      }
    });
  }

  private clearSuccess(): void {
    this.submitSuccess = false;
    sessionStorage.removeItem(SESSION_KEY);
  }
}