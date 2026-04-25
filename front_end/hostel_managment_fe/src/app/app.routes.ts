import { Routes } from '@angular/router';
import { HostelListComponent } from './hostel-list/hostel-list';
import { roleGuard } from './role-guard';


export const routes: Routes = [
  { path: '', component: HostelListComponent },
  { path: 'auth/login', loadComponent: () => import('./login/login').then(m => m.LoginComponent) },
  { path: 'auth/register', loadComponent: () => import('./register/register').then(m => m.RegisterComponent) },
  { path: 'profile', loadComponent: () => import('./profile/profile').then(m => m.ProfileComponent) },
  { path: 'tenant/dashboard', loadComponent: () => import('./dashboard/tenant-dashboard').then(m => m.TenantDashboardComponent), canMatch: [roleGuard(['TENANT'])] },
  { path: 'tenant/book-room', loadComponent: () => import('./tenant-booking/tenant-booking').then(m => m.TenantBookingComponent), canMatch: [roleGuard(['TENANT'])] },
  { path: 'owner/dashboard', loadComponent: () => import('./dashboard/owner-dashboard').then(m => m.OwnerDashboardComponent), canMatch: [roleGuard(['OWNER', 'ADMIN'])] },
  { path: 'owner/hostels', loadComponent: () => import('./owner-hostel/owner-hostel').then(m => m.OwnerHostelComponent), canMatch: [roleGuard(['OWNER', 'ADMIN'])] },
  { path: 'admin/dashboard', loadComponent: () => import('./dashboard/admin-dashboard').then(m => m.AdminDashboardComponent), canMatch: [roleGuard(['ADMIN'])] },
  { path: 'admin/owners', loadComponent: () => import('./admin-owner-management/admin-owner-management').then(m => m.AdminOwnerManagementComponent), canMatch: [roleGuard(['ADMIN'])] },
];
