import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  const router = inject(Router);

  const clearAndRedirect = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.navigate(['/login']);
  };

  // Nếu có token, kiểm tra hết hạn trước khi gắn vào request
  if (token) {
    try {
      // Decode JWT payload để kiểm tra exp
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isExpired = payload.exp && (payload.exp * 1000) < Date.now();

      if (isExpired) {
        // Token hết hạn → xóa localStorage + redirect login
        clearAndRedirect();
        return next(req);
      }
    } catch {
      // Token malformed → xóa + redirect login
      clearAndRedirect();
      return next(req);
    }

    const cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });

    return next(cloned).pipe(
      catchError((err: HttpErrorResponse) => {
        // Token bị reject bởi server → xóa token + redirect login
        if (err.status === 401 || err.status === 403) {
          clearAndRedirect();
        }
        return throwError(() => err);
      })
    );
  }

  return next(req);
};