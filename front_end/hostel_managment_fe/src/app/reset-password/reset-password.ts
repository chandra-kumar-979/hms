import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <section class="wrap">
      <mat-card class="card">
        <mat-card-header>
          <mat-card-title>Set New Password</mat-card-title>
          <mat-card-subtitle>Choose a strong password for your account</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          @if (!done()) {
            @if (!token) {
              <p class="error-msg"><mat-icon>error_outline</mat-icon> Invalid reset link. Please request a new one.</p>
            } @else {
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>New Password</mat-label>
                <input matInput [(ngModel)]="password" [type]="show ? 'text' : 'password'" placeholder="Min 6 characters" />
                <button mat-icon-button matSuffix (click)="show = !show" type="button">
                  <mat-icon>{{ show ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Confirm Password</mat-label>
                <input matInput [(ngModel)]="confirm" [type]="show ? 'text' : 'password'" placeholder="Repeat password" />
              </mat-form-field>
              @if (error()) {
                <p class="error-msg"><mat-icon>error_outline</mat-icon> {{ error() }}</p>
              }
            }
          } @else {
            <div class="success-box">
              <mat-icon class="success-icon">check_circle</mat-icon>
              <h3>Password updated!</h3>
              <p>You can now log in with your new password.</p>
            </div>
          }
        </mat-card-content>
        <mat-card-actions align="end">
          @if (done()) {
            <a mat-flat-button color="primary" routerLink="/auth/login">Go to Login</a>
          } @else if (token) {
            <button mat-flat-button color="primary" [disabled]="loading() || !password || !confirm" (click)="submit()">
              {{ loading() ? 'Updating...' : 'Update Password' }}
            </button>
          } @else {
            <a mat-flat-button routerLink="/auth/forgot-password">Request New Link</a>
          }
        </mat-card-actions>
      </mat-card>
    </section>
  `,
  styles: [`
    .wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#667eea,#764ba2); padding:16px; }
    .card { width:100%; max-width:420px; border-radius:16px; box-shadow:0 20px 60px rgba(0,0,0,.3); }
    .full-width { width:100%; display:block; margin-bottom:8px; }
    .error-msg { color:#f44336; display:flex; align-items:center; gap:6px; font-size:14px; }
    .success-box { text-align:center; padding:16px 0; }
    .success-icon { font-size:56px; width:56px; height:56px; color:#4caf50; }
    .success-box h3 { margin:12px 0 4px; }
    .success-box p { color:#666; }
  `]
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  password = '';
  confirm = '';
  show = false;
  loading = signal(false);
  done = signal(false);
  error = signal<string | null>(null);

  constructor(private route: ActivatedRoute, private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
  }

  submit() {
    this.error.set(null);
    if (this.password !== this.confirm) { this.error.set('Passwords do not match.'); return; }
    if (this.password.length < 6) { this.error.set('Password must be at least 6 characters.'); return; }
    this.loading.set(true);
    this.http.post<any>(`${environment.apiUrl}/auth/reset-password`, { token: this.token, new_password: this.password }).subscribe({
      next: () => { this.loading.set(false); this.done.set(true); },
      error: (err) => { this.loading.set(false); this.error.set(err?.error?.detail ?? 'Reset failed. The link may have expired.'); }
    });
  }
}
