import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <section class="wrap">
      <mat-card class="card">
        <mat-card-header>
          <mat-card-title>Forgot Password</mat-card-title>
          <mat-card-subtitle>Enter your email and we'll send a reset link</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          @if (!sent()) {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput [(ngModel)]="email" type="email" placeholder="you@example.com" />
              <mat-icon matSuffix>email</mat-icon>
            </mat-form-field>
            @if (error()) {
              <p class="error-msg"><mat-icon>error_outline</mat-icon> {{ error() }}</p>
            }
          } @else {
            <div class="success-box">
              <mat-icon class="success-icon">mark_email_read</mat-icon>
              <h3>Check your inbox</h3>
              <p>{{ message() }}</p>
              @if (devUrl()) {
                <div class="dev-link">
                  <p><strong>Dev mode:</strong> No SMTP configured. Use this link to reset:</p>
                  <a [href]="devUrl()!" target="_blank" style="word-break:break-all;color:#6366f1;">{{ devUrl() }}</a>
                </div>
              }
            </div>
          }
        </mat-card-content>
        <mat-card-actions align="end">
          <a mat-button routerLink="/auth/login">Back to Login</a>
          @if (!sent()) {
            <button mat-flat-button color="primary" [disabled]="loading() || !email" (click)="submit()">
              {{ loading() ? 'Sending...' : 'Send Reset Link' }}
            </button>
          }
        </mat-card-actions>
      </mat-card>
    </section>
  `,
  styles: [`
    .wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#667eea,#764ba2); padding:16px; }
    .card { width:100%; max-width:420px; border-radius:16px; box-shadow:0 20px 60px rgba(0,0,0,.3); }
    .full-width { width:100%; display:block; }
    .error-msg { color:#f44336; display:flex; align-items:center; gap:6px; font-size:14px; }
    .success-box { text-align:center; padding:16px 0; }
    .success-icon { font-size:56px; width:56px; height:56px; color:#6366f1; }
    .success-box h3 { margin:12px 0 4px; }
    .success-box p { color:#666; }
    .dev-link { background:#f3f4f6; border-radius:8px; padding:12px; margin-top:12px; text-align:left; font-size:13px; }
  `]
})
export class ForgotPasswordComponent {
  email = '';
  loading = signal(false);
  sent = signal(false);
  error = signal<string | null>(null);
  message = signal('');
  devUrl = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  submit() {
    this.error.set(null);
    this.loading.set(true);
    this.http.post<any>(`${environment.apiUrl}/auth/forgot-password`, { email: this.email }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.sent.set(true);
        this.message.set(res.message);
        if (res.reset_url) this.devUrl.set(res.reset_url);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.detail ?? 'Something went wrong. Please try again.');
      }
    });
  }
}
