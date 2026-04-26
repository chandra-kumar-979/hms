import { Component, signal } from '@angular/core';
import { AuthService } from '../auth';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  email = '';
  password = '';
  showPassword = false;
  error = signal<string | null>(null);
  loading = signal(false);

  constructor(private auth: AuthService, private router: Router) {}

  login() {
    this.error.set(null);
    if (!this.email.trim() || !this.password) {
      this.error.set('Please enter your email and password.');
      return;
    }
    this.loading.set(true);
    this.auth.loginWithPassword({ email: this.email.trim(), password: this.password }).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/']); },
      error: (err) => { this.loading.set(false); this.error.set(err?.error?.detail ?? 'Login failed. Check your email and password.'); }
    });
  }
}
