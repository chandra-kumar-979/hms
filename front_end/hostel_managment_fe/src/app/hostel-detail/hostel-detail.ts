import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../auth';

@Component({
  selector: 'app-hostel-detail',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule, MatDividerModule, MatProgressSpinnerModule],
  template: `
    <div class="detail-wrap">
      @if (loading()) {
        <div class="center"><mat-spinner></mat-spinner></div>
      } @else if (hostel()) {
        <div class="detail-hero">
          @if (hostel()?.images?.length) {
            <img [src]="hostel()!.images[0]" class="hero-img" alt="Hostel" />
          } @else {
            <div class="hero-placeholder"><mat-icon>apartment</mat-icon></div>
          }
          <div class="hero-overlay">
            <h1>{{ hostel()!.name }}</h1>
            <p><mat-icon>location_on</mat-icon> {{ hostel()!.location }}</p>
          </div>
        </div>

        <div class="detail-body">
          <div class="info-grid">
            <mat-card class="info-card">
              <mat-card-content>
                <div class="stat"><mat-icon>currency_rupee</mat-icon><span>₹{{ hostel()!.price_per_bed }}/month</span></div>
                <div class="stat"><mat-icon>star</mat-icon><span>{{ hostel()!.rating ?? 'No rating yet' }}</span></div>
                <div class="stat"><mat-icon>bed</mat-icon><span>{{ hostel()!.available_beds }} / {{ hostel()!.total_beds }} beds available</span></div>
              </mat-card-content>
            </mat-card>

            @if (hostel()!.owner) {
              <mat-card class="owner-card">
                <mat-card-header><mat-card-title>Owner / Contact</mat-card-title></mat-card-header>
                <mat-card-content>
                  <div class="owner-row"><mat-icon>person</mat-icon><span>{{ hostel()!.owner.name }}</span></div>
                  @if (hostel()!.owner.email) {
                    <div class="owner-row">
                      <mat-icon>email</mat-icon>
                      <a [href]="'mailto:' + hostel()!.owner.email">{{ hostel()!.owner.email }}</a>
                    </div>
                  }
                  @if (hostel()!.owner.phone) {
                    <div class="owner-row">
                      <mat-icon>phone</mat-icon>
                      <a [href]="'tel:' + hostel()!.owner.phone">{{ hostel()!.owner.phone }}</a>
                    </div>
                  }
                </mat-card-content>
              </mat-card>
            }

            <mat-card class="location-card">
              <mat-card-header><mat-card-title>Location & Directions</mat-card-title></mat-card-header>
              <mat-card-content>
                <div class="owner-row"><mat-icon>location_on</mat-icon><span>{{ hostel()!.location }}</span></div>
                <a mat-stroked-button [href]="mapsUrl()" target="_blank" style="margin-top:12px">
                  <mat-icon>map</mat-icon> Open in Google Maps
                </a>
              </mat-card-content>
            </mat-card>
          </div>

          @if (hostel()!.description) {
            <mat-card class="desc-card">
              <mat-card-header><mat-card-title>About this Hostel</mat-card-title></mat-card-header>
              <mat-card-content><p>{{ hostel()!.description }}</p></mat-card-content>
            </mat-card>
          }

          @if (hostel()!.amenities?.length) {
            <mat-card class="amenities-card">
              <mat-card-header><mat-card-title>Amenities</mat-card-title></mat-card-header>
              <mat-card-content>
                <mat-chip-set>
                  @for (a of hostel()!.amenities; track a) {
                    <mat-chip><mat-icon>check_circle</mat-icon> {{ a }}</mat-chip>
                  }
                </mat-chip-set>
              </mat-card-content>
            </mat-card>
          }

          <div class="actions">
            <a mat-button routerLink="/">← Back to listings</a>
            @if (isLoggedIn() && userRole() === 'TENANT') {
              <a mat-flat-button color="primary" routerLink="/tenant/book-room">
                <mat-icon>book_online</mat-icon> Book a Bed
              </a>
            } @else if (!isLoggedIn()) {
              <a mat-flat-button color="primary" routerLink="/auth/register">
                <mat-icon>login</mat-icon> Register to Book
              </a>
            }
          </div>
        </div>
      } @else {
        <div class="center"><p>Hostel not found.</p></div>
      }
    </div>
  `,
  styles: [`
    .detail-wrap { max-width: 900px; margin: 0 auto; padding: 16px; }
    .center { display:flex; justify-content:center; padding:60px; }
    .detail-hero { position:relative; border-radius:16px; overflow:hidden; height:280px; background:#1a1a2e; }
    .hero-img { width:100%; height:100%; object-fit:cover; }
    .hero-placeholder { display:flex; align-items:center; justify-content:center; height:100%; mat-icon { font-size:80px; color:#444; } }
    .hero-overlay { position:absolute; bottom:0; left:0; right:0; background:linear-gradient(transparent,rgba(0,0,0,.8)); color:#fff; padding:24px; }
    .hero-overlay h1 { margin:0 0 4px; font-size:2rem; }
    .hero-overlay p { margin:0; display:flex; align-items:center; gap:4px; opacity:.85; }
    .detail-body { margin-top:16px; display:flex; flex-direction:column; gap:16px; }
    .info-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:16px; }
    .stat { display:flex; align-items:center; gap:8px; margin-bottom:8px; font-size:16px; }
    .owner-row { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
    .owner-row a { color:#6366f1; text-decoration:none; }
    .actions { display:flex; gap:12px; align-items:center; flex-wrap:wrap; padding:8px 0; }
  `]
})
export class HostelDetailComponent implements OnInit {
  hostel = signal<any>(null);
  loading = signal(true);

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private auth: AuthService
  ) {}

  get isLoggedIn() { return this.auth.isLoggedIn; }
  get userRole() { return this.auth.userRole; }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.http.get<any>(`${environment.apiUrl}/hostels/${id}`).subscribe({
      next: (res) => { this.hostel.set(res); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  mapsUrl() {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(this.hostel()?.location ?? '')}`;
  }
}
