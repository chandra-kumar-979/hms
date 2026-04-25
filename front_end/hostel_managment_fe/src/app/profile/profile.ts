import { Component, Inject, PLATFORM_ID, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './profile.html'
})
export class ProfileComponent {
  api = `${environment.apiUrl}/users/me`;
  name = '';
  phone = '';
  profile_image = '';
  message = signal('');

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) platformId: object) {
    if (isPlatformBrowser(platformId)) {
      this.http.get<any>(this.api).subscribe((user) => {
        this.name = user.name ?? '';
        this.phone = user.phone ?? '';
        this.profile_image = user.profile_image ?? '';
      });
    }
  }

  save() {
    this.http.patch<any>(this.api, { name: this.name, phone: this.phone, profile_image: this.profile_image }).subscribe({
      next: () => this.message.set('Profile updated'),
      error: () => this.message.set('Profile update failed'),
    });
  }
}
