// admin.guard.ts
// Place this in: src/app/myservices/admin.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';

export const adminGuard: CanActivateFn = () => {
  const auth   = inject(Auth);
  const router = inject(Router);

  if (auth.isLoggedIn() && auth.getUser()?.role === 'admin') {
    return true;
  }

  router.navigate(['/login']);
  return false;
};