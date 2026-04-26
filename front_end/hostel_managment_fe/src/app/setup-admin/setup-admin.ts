import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth';

@Component({
  selector: 'app-setup-admin',
  standalone: true,
  imports: [FormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <section class="wrap">
      <mat-card class="card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon style="color:#6366f1;vertical-align:middle;margin-right:8px;">admin_panel_settings</mat-icon>
            First-Time Admin Setup
          </mat-card-title>
          <mat-card-subtitle>Create the administrator account. This page works only once.</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          @if (!done()) {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Admin Name</mat-label>
              <input matInput [(ngModel)]="name" placeholder="Your name" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput [(ngModel)]="email" type="email" placeholder="admin@example.com" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput [(ngModel)]="password" [type]="show ? 'text' : 'password'" placeholder="Min 6 characters" />
              <button mat-icon-button matSuffix (click)="show=!show" type="button">
                <mat-icon>{{ show ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>
            @if (error()) {
              <p class="error-msg"><mat-icon>error_outline</mat-icon> {{ error() }}</p>
            }
          } @else {
            <div class="success-box">
              <mat-icon class="success-icon">check_circle</mat-icon>
              <h3>Admin account created!</h3>
              <p>You are now logged in as Admin.</p>
            </div>
          }
        </mat-card-content>
        <mat-card-actions align="end">
          @if (!done()) {
            <a mat-button routerLink="/auth/login">Already have an account?</a>
            <button mat-flat-button color="primary" [disabled]="loading() || !name || !email || !password" (click)="submit()">
              {{ loading() ? 'Creating...' : 'Create Admin Account' }}
            </button>
          } @else {
            <a mat-flat-button color="primary" routerLink="/admin/dashboard">Go to Admin Dashboard</a>
          }
        </mat-card-actions>
      </mat-card>
    </section>
  `,
  styles: [`
    .wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460); padding:16px; }
    .card { width:100%; max-width:440px; border-radius:16px; box-shadow:0 20px 60px rgba(0,0,0,.4); }
    .full-width { width:100%; display:block; margin-bottom:8px; }
    .error-msg { color:#f44336; display:flex; align-items:center; gap:6px; font-size:14px; }
    .success-box { text-align:center; padding:16px 0; }
    .success-icon { font-size:56px; width:56px; height:56px; color:#4caf50; }
    .success-box h3 { margin:12px 0 4px; }
    .success-box p { color:#666; }
  `]
})
export class SetupAdminComponent {
  name = '';
  email = '';
  password = '';
  show = false;
  loading = signal(false);
  done = signal(false);
  error = signal<string | null>(null);

  constructor(private http: HttpClient, private auth: AuthService, private router: Router) {}

  submit() {
    this.error.set(null);
    if (this.password.length < 6) { this.error.set('Password must be at least 6 characters.'); return; }
    this.loading.set(true);
    this.http.post<any>(`${environment.apiUrl}/auth/setup-admin`, {
      name: this.name, email: this.email, password: this.password, role: 'ADMIN'
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.done.set(true);
        // Auto-login
        if (res.token) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('userRole', res.role);
          localStorage.setItem('userName', res.name);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.detail ?? 'Setup failed.');
      }
    });
  }
}
