import { Component, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../auth';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, MatToolbarModule, MatButtonModule, MatIconModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss']
})
export class NavbarComponent {
  isLoggedIn = signal(false);
  userRole = signal<'TENANT' | 'OWNER' | 'ADMIN' | null>(null);
  userName = signal<string | null>(null);

  constructor(private router: Router, private auth: AuthService) {
    this.isLoggedIn = this.auth.isLoggedIn;
    this.userRole = this.auth.userRole;
    this.userName = this.auth.userName;
  }

  quickDevLogin(role: 'TENANT' | 'OWNER' | 'ADMIN') {
    const key = role.toLowerCase();
    this.auth
      .devLogin({
        email: `${key}.demo@hostelms.local`,
        name: `Demo ${role}`,
        role
      })
      .subscribe({
        next: () => this.router.navigate(['/']),
        error: () => this.router.navigate(['/auth/login'])
      });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
