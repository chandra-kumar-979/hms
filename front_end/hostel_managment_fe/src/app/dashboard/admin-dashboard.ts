import { Component, Inject, PLATFORM_ID, signal, computed } from '@angular/core';
import { environment } from '../../environments/environment';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    MatCardModule, MatButtonModule, MatIconModule, MatSnackBarModule,
    MatProgressSpinnerModule, MatTooltipModule, RouterLink,
  ],
  template: `
    <div class="page-header">
      <h1>Admin Dashboard</h1>
      <p>Manage and monitor all hostel owners</p>
    </div>

    <!-- Stat cards -->
    <div class="stat-grid">
      <div class="stat-card indigo" style="animation-delay:.05s">
        <span class="stat-icon">👥</span>
        <div class="stat-value">{{ owners().length }}</div>
        <div class="stat-label">Total Owners</div>
      </div>
      <div class="stat-card green" style="animation-delay:.12s">
        <span class="stat-icon">✅</span>
        <div class="stat-value">{{ activeCount() }}</div>
        <div class="stat-label">Active</div>
      </div>
      <div class="stat-card rose" style="animation-delay:.19s">
        <span class="stat-icon">🚫</span>
        <div class="stat-value">{{ inactiveCount() }}</div>
        <div class="stat-label">Inactive</div>
      </div>
    </div>

    <!-- Toolbar -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:.75rem;">
      <div class="section-title" style="margin:0;">
        <mat-icon>manage_accounts</mat-icon> Owner Accounts
      </div>
      <div style="display:flex;gap:.75rem;">
        <button mat-stroked-button routerLink="/admin/owners">
          <mat-icon>person_add</mat-icon> Add Owner
        </button>
        <button mat-stroked-button (click)="reload()" [disabled]="loading()">
          <mat-icon>refresh</mat-icon> {{ loading() ? 'Refreshing…' : 'Refresh' }}
        </button>
      </div>
    </div>

    @if (loading()) {
      <div style="text-align:center;padding:2rem;">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    }

    <div class="owner-grid">
      @for (o of owners(); track o.id) {
        <div class="owner-card">
          <div style="display:flex;align-items:center;gap:.75rem;">
            <div class="oc-avatar">{{ (o.name || '?')[0].toUpperCase() }}</div>
            <div>
              <div class="oc-name">{{ o.name }}</div>
              <div class="oc-email">{{ o.email }}</div>
            </div>
          </div>
          @if (o.phone) {
            <div style="font-size:.8rem;color:var(--c-text-soft);display:flex;align-items:center;gap:.3rem;">
              <mat-icon style="font-size:.9rem;">phone</mat-icon> {{ o.phone }}
            </div>
          }
          <div class="oc-footer">
            <span class="chip {{ o.is_active !== false ? 'active' : 'inactive' }}">
              {{ o.is_active !== false ? 'Active' : 'Inactive' }}
            </span>
            <button mat-stroked-button style="font-size:.8rem;height:32px;line-height:32px;"
              [matTooltip]="o.is_active !== false ? 'Disable this owner account' : 'Enable this owner account'"
              (click)="toggle(o)">
              <mat-icon style="font-size:.9rem;">{{ o.is_active !== false ? 'block' : 'check_circle' }}</mat-icon>
              {{ o.is_active !== false ? 'Disable' : 'Enable' }}
            </button>
          </div>
        </div>
      }
    </div>

    @if (!owners().length && !loading()) {
      <div style="text-align:center;padding:3rem;color:#94a3b8;">
        <mat-icon style="font-size:3.5rem;display:block;margin:0 auto .75rem;opacity:.3;">manage_accounts</mat-icon>
        <p>No owners found. Add one via <a routerLink="/admin/owners" style="color:var(--c-primary);">Manage Owners</a>.</p>
      </div>
    }
  `,
})
export class AdminDashboardComponent {
  owners  = signal<any[]>([]);
  loading = signal(false);
  private browser: boolean;

  activeCount   = computed(() => this.owners().filter(o => o.is_active !== false).length);
  inactiveCount = computed(() => this.owners().filter(o => o.is_active === false).length);

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.browser = isPlatformBrowser(platformId);
    if (this.browser) this.reload();
  }

  reload() {
    this.loading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/admin/owners`).subscribe({
      next: (res) => { this.owners.set(res); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('Failed to load owners', 'Close', { duration: 2500 }); },
    });
  }

  toggle(owner: any) {
    const next = owner.is_active === false ? true : false;
    this.http.patch(`${environment.apiUrl}/admin/owners/status`, { owner_id: owner.id, is_active: next }).subscribe({
      next: () => {
        this.snackBar.open(`Owner ${next ? 'enabled' : 'disabled'}`, 'Close', { duration: 2000 });
        this.reload();
      },
      error: () => this.snackBar.open('Update failed', 'Close', { duration: 2500 }),
    });
  }
}
