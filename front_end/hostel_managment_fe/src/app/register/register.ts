import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { AuthService } from '../auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule],
  templateUrl: './register.html',
  styles: [`
    .register-wrap {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 16px;
    }
    .register-card {
      width: 100%;
      max-width: 440px;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .full-width { width: 100%; margin-bottom: 8px; display: block; }
    .error-msg { color: #f44336; font-size: 14px; margin: 8px 0; }
    mat-card-header { margin-bottom: 16px; }
  `]
})
export class RegisterComponent {
  name = '';
  email = '';
  phone = '';
  role = 'TENANT';
  error = signal<string | null>(null);

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    this.error.set(null);
    this.auth.register({ name: this.name, email: this.email, phone: this.phone, role: this.role }).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => this.error.set(err?.error?.detail ?? 'Registration failed. Check if the server is reachable.'),
    });
  }
}
