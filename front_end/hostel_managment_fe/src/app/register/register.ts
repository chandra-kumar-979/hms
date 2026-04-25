import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { AuthService } from '../auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './register.html'
})
export class RegisterComponent {
  name = '';
  email = '';
  phone = '';
  error = signal<string | null>(null);

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    this.error.set(null);
    this.auth.register({ name: this.name, email: this.email, phone: this.phone, role: 'TENANT' }).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => this.error.set(err?.error?.detail ?? 'Registration failed'),
    });
  }
}
