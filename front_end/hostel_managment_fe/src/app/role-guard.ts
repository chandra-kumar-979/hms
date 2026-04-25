import { CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth';

export const roleGuard = (roles: Array<'TENANT' | 'OWNER' | 'ADMIN'>): CanMatchFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isLoggedIn()) {
      return router.parseUrl('/auth/login');
    }
    if (roles.includes(auth.userRole() as 'TENANT' | 'OWNER' | 'ADMIN')) {
      return true;
    }
    return router.parseUrl('/');
  };
};
