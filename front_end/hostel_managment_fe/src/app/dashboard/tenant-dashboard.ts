import { Component, Inject, PLATFORM_ID, signal, computed } from '@angular/core';
import { environment } from '../../environments/environment';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser, LowerCasePipe, DecimalPipe, DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tenant-dashboard',
  standalone: true,
  imports: [
    MatCardModule, MatButtonModule, MatIconModule, MatTabsModule,
    MatChipsModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatDividerModule, MatTooltipModule,
    RouterLink, LowerCasePipe, DecimalPipe, FormsModule,
  ],
  styles: [`
    .vacate-form { background: #f8faff; border: 1.5px dashed #c7d7f5; border-radius: 14px; padding: 1.25rem; margin-top: 1rem; }
    .vacate-form h4 { margin: 0 0 .75rem; font-size: 1rem; font-weight: 700; color: #3b5bdb; display: flex; align-items: center; gap: .4rem; }
    .vacate-card { border-radius: 14px; border: 1.5px solid #e2e8f0; padding: 1.1rem 1.2rem; margin-bottom: .85rem; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.04); animation: fade-in-up .35s both; }
    .vcstatus { display: inline-flex; align-items: center; gap: .3rem; padding: .2rem .75rem; border-radius: 20px; font-size: .78rem; font-weight: 700; }
    .vcstatus.pending { background: #fef9c3; color: #b45309; }
    .vcstatus.approved { background: #dcfce7; color: #15803d; }
    .vcstatus.completed { background: #e0e7ff; color: #3b5bdb; }
    .vcstatus.rejected { background: #fee2e2; color: #b91c1c; }
    .vacate-meta { font-size: .83rem; color: #64748b; margin-top: .25rem; }
    .vacate-reason { font-style: italic; color: #94a3b8; font-size: .8rem; margin-top: .2rem; }
  `],
  template: `
    <div class="page-header">
      <h1>My Dashboard</h1>
      <p>Your bookings, payments, and notifications at a glance</p>
    </div>

    <!-- Stat cards -->
    <div class="stat-grid">
      <div class="stat-card blue" style="animation-delay:.05s">
        <span class="stat-icon">📋</span>
        <div class="stat-value">{{ bookings().length }}</div>
        <div class="stat-label">Bookings</div>
        <div class="stat-sub">{{ approvedCount() }} approved</div>
      </div>
      <div class="stat-card green" style="animation-delay:.12s">
        <span class="stat-icon">💳</span>
        <div class="stat-value">{{ payments().length }}</div>
        <div class="stat-label">Payments</div>
        <div class="stat-sub">₹{{ totalPaid() | number:'1.0-0' }} paid</div>
      </div>
      <div class="stat-card purple" style="animation-delay:.19s">
        <span class="stat-icon">🔔</span>
        <div class="stat-value">{{ unreadCount() }}</div>
        <div class="stat-label">Unread</div>
        <div class="stat-sub">{{ notifications().length }} total</div>
      </div>
      <div class="stat-card orange" style="animation-delay:.26s">
        <span class="stat-icon">🚪</span>
        <div class="stat-value">{{ vacateRequests().length }}</div>
        <div class="stat-label">Vacate</div>
        <div class="stat-sub">{{ pendingVacate() }} pending</div>
      </div>
    </div>

    <!-- Tabs -->
    <mat-card style="padding: 0; overflow: hidden;">
      <mat-tab-group dynamicHeight>

        <!-- Bookings tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon style="margin-right:.35rem;font-size:1rem;">calendar_today</mat-icon>
            Bookings
          </ng-template>
          <div style="padding: 1.25rem;">
            @if (loading()) {
              <div style="text-align:center;padding:2rem;"><mat-spinner diameter="36"></mat-spinner></div>
            } @else if (!bookings().length) {
              <div style="text-align:center;padding:2rem;color:#94a3b8;">
                <mat-icon style="font-size:3rem;display:block;margin:0 auto .5rem;opacity:.3">calendar_today</mat-icon>
                <p>No bookings yet. <a routerLink="/tenant/book-room" style="color:var(--c-primary);">Book a room</a></p>
              </div>
            }
            @for (b of bookings(); track b.id) {
              <div class="data-row">
                <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#3b5bdb,#74a0f5);display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;">
                  <mat-icon style="font-size:1.1rem;">bed</mat-icon>
                </div>
                <div class="row-main">
                  <div class="row-label">Booking #{{ b.id }} – Bed {{ b.bed_id }}</div>
                  <div class="row-meta">{{ b.start_date }} → {{ b.end_date }}</div>
                </div>
                <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;">
                  <span class="chip {{ b.status | lowercase }}">{{ b.status }}</span>
                  @if (b.status === 'APPROVED') {
                    @if (!hasPendingPayment(b.id)) {
                      <button mat-flat-button style="font-size:.75rem;height:30px;line-height:30px;padding:0 12px;background:#3b5bdb!important;color:#fff!important;"
                        (click)="openPayForm(b.id)">
                        <mat-icon style="font-size:.9rem;vertical-align:middle;">payment</mat-icon>
                        Pay Rent
                      </button>
                    } @else {
                      <span style="font-size:.75rem;color:#059669;font-weight:600;">💳 Payment submitted</span>
                    }
                    @if (!hasVacateRequest(b.id)) {
                      <button mat-stroked-button color="warn"
                        style="font-size:.75rem;height:30px;line-height:30px;padding:0 10px;"
                        (click)="openVacateForm(b.id)">
                        <mat-icon style="font-size:.9rem;vertical-align:middle;">exit_to_app</mat-icon>
                        Vacate
                      </button>
                    } @else {
                      <span style="font-size:.75rem;color:#f59e0b;font-weight:600;">⏳ Vacate raised</span>
                    }
                  }
                </div>
              </div>
            }

            <!-- Pay Rent form -->
            @if (payFormBookingId()) {
              <div class="vacate-form" style="border-color:#bfdbfe;background:#eff6ff;">
                <h4 style="color:#1d4ed8;"><mat-icon style="font-size:1rem;">payment</mat-icon> Pay Rent – Booking #{{ payFormBookingId() }}</h4>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:.65rem;margin-bottom:.65rem;">
                  <mat-form-field appearance="outline">
                    <mat-label>Amount (₹) *</mat-label>
                    <input matInput type="number" min="1" [(ngModel)]="payAmount" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Payment Method *</mat-label>
                    <mat-select [(ngModel)]="payMethod">
                      <mat-option value="UPI">UPI</mat-option>
                      <mat-option value="CARD">Card</mat-option>
                      <mat-option value="CASH">Cash</mat-option>
                      <mat-option value="BANK_TRANSFER">Bank Transfer</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
                <mat-form-field appearance="outline" style="width:100%;margin-bottom:.5rem;">
                  <mat-label>Transaction Ref / UPI ID (optional)</mat-label>
                  <input matInput [(ngModel)]="payRef" placeholder="e.g. UPI/20260426/123456" />
                </mat-form-field>
                <mat-form-field appearance="outline" style="width:100%;margin-bottom:.75rem;">
                  <mat-label>Notes (optional)</mat-label>
                  <input matInput [(ngModel)]="payNotes" placeholder="Any remarks for owner…" />
                </mat-form-field>
                <div style="display:flex;gap:.65rem;">
                  <button mat-flat-button style="background:#3b5bdb!important;color:#fff!important;"
                    [disabled]="!payAmount || payAmount <= 0 || !payMethod || payBusy()"
                    (click)="submitPayment()">
                    {{ payBusy() ? 'Submitting…' : '💳 Submit Payment' }}
                  </button>
                  <button mat-stroked-button (click)="payFormBookingId.set(null)">Cancel</button>
                </div>
                <p style="font-size:.78rem;color:#64748b;margin-top:.6rem;">
                  💡 Owner will review and approve your payment. Receipt available after approval.
                </p>
              </div>
            }

            <!-- Vacate notice form -->
            @if (vacateFormBookingId()) {
              <div class="vacate-form">
                <h4><mat-icon style="font-size:1rem;">exit_to_app</mat-icon> Raise Vacate Notice – Booking #{{ vacateFormBookingId() }}</h4>

                <mat-form-field appearance="outline" style="width:100%;margin-bottom:.5rem;">
                  <mat-label>Planned vacate date</mat-label>
                  <input matInput type="date" [(ngModel)]="vacateDate"
                    [min]="todayStr()"
                    (ngModelChange)="onVacateDateChange($event)" />
                  <mat-hint>Select today or a future date</mat-hint>
                </mat-form-field>

                @if (vacateDateError) {
                  <p style="color:#b91c1c;font-size:.82rem;margin:-.25rem 0 .5rem;display:flex;align-items:center;gap:.3rem;background:#fee2e2;padding:.35rem .65rem;border-radius:8px;">
                    <mat-icon style="font-size:.9rem;flex-shrink:0;">warning</mat-icon> {{ vacateDateError }}
                  </p>
                }
                @if (vacateDate && !vacateDateError) {
                  <p style="color:#15803d;font-size:.82rem;margin:-.25rem 0 .5rem;display:flex;align-items:center;gap:.3rem;background:#dcfce7;padding:.35rem .65rem;border-radius:8px;">
                    <mat-icon style="font-size:.9rem;flex-shrink:0;">check_circle</mat-icon>
                    Vacating on {{ vacateDate }}
                    @if (noticeDays() > 0) { · <strong>{{ noticeDays() }} days notice</strong> }
                    @if (noticeDays() < 7) { <span style="color:#b45309;"> — consider giving at least 7 days</span> }
                  </p>
                }

                <mat-form-field appearance="outline" style="width:100%;margin-bottom:.75rem;">
                  <mat-label>Reason (optional)</mat-label>
                  <input matInput [(ngModel)]="vacateReason" placeholder="e.g. Shifting jobs, end of course…" />
                </mat-form-field>

                <div style="display:flex;gap:.65rem;">
                  <button mat-flat-button color="warn"
                    [disabled]="!vacateDate || !!vacateDateError || vacateBusy()"
                    (click)="submitVacate()">
                    {{ vacateBusy() ? 'Submitting…' : 'Submit Notice' }}
                  </button>
                  <button mat-stroked-button (click)="vacateFormBookingId.set(null)">Cancel</button>
                </div>
                <p style="font-size:.78rem;color:#64748b;margin-top:.6rem;">
                  💡 Tip: Give at least 7–15 days notice so the owner can arrange inspection and deposit refund.
                </p>
              </div>
            }
          </div>
        </mat-tab>

        <!-- Payments tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon style="margin-right:.35rem;font-size:1rem;">payments</mat-icon>
            Payments
          </ng-template>
          <div style="padding: 1.25rem;">
            @if (!payments().length) {
              <div style="text-align:center;padding:2rem;color:#94a3b8;">
                <mat-icon style="font-size:3rem;display:block;margin:0 auto .5rem;opacity:.3">receipt_long</mat-icon>
                <p>No payment records yet.</p>
              </div>
            }
            @for (p of payments(); track p.id) {
              <div class="data-row">
                <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#065f46,#34d399);display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;">
                  <mat-icon style="font-size:1.1rem;">receipt</mat-icon>
                </div>
                <div class="row-main">
                  <div class="row-label">₹{{ p.amount | number:'1.0-0' }} · {{ p.payment_method || p.type }} · {{ p.month_year || '—' }}</div>
                  <div class="row-meta">
                    Booking #{{ p.booking_id }}
                    @if (p.due_date) { · Due {{ p.due_date }} }
                    @if (p.transaction_ref) { · Ref: {{ p.transaction_ref }} }
                    @if (p.owner_remarks) {
                      <span style="color:#6366f1;"> · "{{ p.owner_remarks }}"</span>
                    }
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;">
                  <span class="chip {{ (p.status || '') | lowercase }}">{{ p.status }}</span>
                  @if (p.status === 'APPROVED') {
                    <button mat-icon-button matTooltip="Download PDF Receipt"
                      style="color:#3b5bdb;"
                      (click)="downloadReceipt(p.id)">
                      <mat-icon style="font-size:1.1rem;">download</mat-icon>
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        </mat-tab>

        <!-- Notifications tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon style="margin-right:.35rem;font-size:1rem;">notifications</mat-icon>
            Alerts
            @if (unreadCount() > 0) {
              <span style="background:#ef4444;color:#fff;border-radius:20px;padding:0 6px;font-size:.7rem;margin-left:.35rem;font-weight:700;">
                {{ unreadCount() }}
              </span>
            }
          </ng-template>
          <div style="padding: 1.25rem;">
            @if (!notifications().length) {
              <div style="text-align:center;padding:2rem;color:#94a3b8;">
                <mat-icon style="font-size:3rem;display:block;margin:0 auto .5rem;opacity:.3">notifications_none</mat-icon>
                <p>No notifications.</p>
              </div>
            }
            @for (n of notifications(); track n.id) {
              <div class="notif-row" [class.unread]="!n.read">
                @if (!n.read) { <div class="notif-dot"></div> }
                <div class="notif-body">
                  <div class="notif-title">{{ n.title }}</div>
                  <div class="notif-msg">{{ n.message }}</div>
                </div>
                @if (!n.read) {
                  <button mat-stroked-button style="font-size:.78rem;height:32px;line-height:32px;" (click)="markRead(n.id)">
                    Mark read
                  </button>
                }
              </div>
            }
          </div>
        </mat-tab>

        <!-- Vacate tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon style="margin-right:.35rem;font-size:1rem;">exit_to_app</mat-icon>
            Vacate
            @if (pendingVacate() > 0) {
              <span style="background:#f59e0b;color:#fff;border-radius:20px;padding:0 6px;font-size:.7rem;margin-left:.35rem;font-weight:700;">
                {{ pendingVacate() }}
              </span>
            }
          </ng-template>
          <div style="padding: 1.25rem;">
            <div style="background:linear-gradient(135deg,#fff7ed,#fef3c7);border-radius:14px;padding:1rem 1.25rem;margin-bottom:1.25rem;border-left:4px solid #f59e0b;">
              <div style="font-weight:700;color:#92400e;margin-bottom:.3rem;">📋 Vacate Process</div>
              <ol style="margin:0;padding-left:1.2rem;font-size:.83rem;color:#78350f;line-height:1.8;">
                <li>Raise a vacate notice from the <strong>Bookings</strong> tab against your active booking.</li>
                <li>Owner will review and approve your notice.</li>
                <li>Clear any pending dues before departure.</li>
                <li>Owner will inspect the room and return security deposit.</li>
                <li>Return keys and collect your clearance confirmation.</li>
              </ol>
            </div>

            @if (!vacateRequests().length) {
              <div style="text-align:center;padding:2rem;color:#94a3b8;">
                <mat-icon style="font-size:3rem;display:block;margin:0 auto .5rem;opacity:.3">door_front</mat-icon>
                <p>No vacate requests yet.</p>
              </div>
            }

            @for (v of vacateRequests(); track v.id) {
              <div class="vacate-card">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:.5rem;">
                  <div>
                    <div style="font-weight:700;font-size:.98rem;">Vacate Request #{{ v.id }}</div>
                    <div class="vacate-meta">Booking #{{ v.booking_id }} · Planned: <strong>{{ v.requested_vacate_date }}</strong></div>
                    @if (v.reason) { <div class="vacate-reason">"{{ v.reason }}"</div> }
                    @if (v.owner_notes) {
                      <div style="margin-top:.4rem;font-size:.82rem;color:#3b5bdb;background:#eef2ff;padding:.3rem .6rem;border-radius:8px;">
                        💬 Owner: {{ v.owner_notes }}
                      </div>
                    }
                  </div>
                  <span class="vcstatus {{ v.status | lowercase }}">
                    {{ v.status === 'PENDING' ? '⏳' : v.status === 'APPROVED' ? '✅' : v.status === 'COMPLETED' ? '🏁' : '❌' }}
                    {{ v.status }}
                  </span>
                </div>

                @if (v.status !== 'COMPLETED' && v.status !== 'REJECTED') {
                  <mat-divider style="margin:.75rem 0;"></mat-divider>
                  <div style="font-size:.82rem;color:#64748b;font-weight:600;margin-bottom:.4rem;">Owner Checklist Status</div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:.35rem .75rem;font-size:.8rem;">
                    <div [style.color]="v.dues_cleared ? '#15803d' : '#94a3b8'">
                      {{ v.dues_cleared ? '✅' : '⬜' }} Dues cleared
                    </div>
                    <div [style.color]="v.inspection_done ? '#15803d' : '#94a3b8'">
                      {{ v.inspection_done ? '✅' : '⬜' }} Room inspected
                    </div>
                    <div [style.color]="v.deposit_refunded ? '#15803d' : '#94a3b8'">
                      {{ v.deposit_refunded ? '✅' : '⬜' }} Deposit refunded
                    </div>
                    <div [style.color]="v.keys_returned ? '#15803d' : '#94a3b8'">
                      {{ v.keys_returned ? '✅' : '⬜' }} Keys returned
                    </div>
                  </div>
                }

                @if (v.status === 'COMPLETED') {
                  <div style="margin-top:.5rem;background:#dcfce7;border-radius:10px;padding:.5rem .75rem;font-size:.82rem;color:#15803d;font-weight:600;">
                    🏁 Vacate completed. Thank you for staying with us!
                  </div>
                }
              </div>
            }
          </div>
        </mat-tab>

      </mat-tab-group>
    </mat-card>

    <div style="margin-top:1rem;display:flex;gap:.75rem;flex-wrap:wrap;">
      <button mat-flat-button routerLink="/tenant/book-room">
        <mat-icon>add_circle</mat-icon> Book a Room
      </button>
      <button mat-stroked-button (click)="reload()" [disabled]="loading()">
        <mat-icon>refresh</mat-icon> {{ loading() ? 'Refreshing...' : 'Refresh' }}
      </button>
    </div>
  `,
})
export class TenantDashboardComponent {
  bookings          = signal<any[]>([]);
  payments          = signal<any[]>([]);
  notifications     = signal<any[]>([]);
  vacateRequests    = signal<any[]>([]);
  loading           = signal(false);
  // Pay form
  payFormBookingId  = signal<number | null>(null);
  payAmount         = 0;
  payMethod         = 'UPI';
  payRef            = '';
  payNotes          = '';
  payBusy           = signal(false);

  // Vacate form
  vacateFormBookingId = signal<number | null>(null);
  vacateDate        = '';
  vacateReason      = '';
  vacateDateError   = '';
  vacateBusy        = signal(false);

  noticeDays = computed(() => {
    if (!this.vacateDate) return 0;
    const diff = new Date(this.vacateDate).getTime() - new Date().setHours(0,0,0,0);
    return Math.max(0, Math.ceil(diff / 86_400_000));
  });
  private browser: boolean;

  approvedCount = computed(() => this.bookings().filter(b => b.status === 'APPROVED').length);
  unreadCount   = computed(() => this.notifications().filter(n => !n.read).length);
  totalPaid     = computed(() => this.payments().filter(p => p.status === 'SUCCESS').reduce((s: number, p: any) => s + (p.amount || 0), 0));
  pendingVacate = computed(() => this.vacateRequests().filter(v => v.status === 'PENDING').length);

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    @Inject(PLATFORM_ID) platformId: object,
    @Inject(DOCUMENT) private document: Document,
  ) {
    this.browser = isPlatformBrowser(platformId);
    if (this.browser) this.reload();
  }

  reload() {
    this.loading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/bookings/me`).subscribe({
      next: (res) => this.bookings.set(res),
      error: () => this.snackBar.open('Failed to load bookings', 'Close', { duration: 2500 }),
    });
    this.http.get<any[]>(`${environment.apiUrl}/payments/me`).subscribe({
      next: (res) => this.payments.set(res),
      error: () => {},
    });
    this.http.get<any[]>(`${environment.apiUrl}/notifications/me`).subscribe({
      next: (res) => { this.notifications.set(res); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.http.get<any[]>(`${environment.apiUrl}/vacate/me`).subscribe({
      next: (res) => this.vacateRequests.set(res),
      error: () => {},
    });
  }

  hasVacateRequest(bookingId: number): boolean {
    return this.vacateRequests().some(v => v.booking_id === bookingId && v.status !== 'REJECTED');
  }

  hasPendingPayment(bookingId: number): boolean {
    const my = new Date().toISOString().slice(0, 7);  // "YYYY-MM"
    return this.payments().some(p => p.booking_id === bookingId && p.month_year === my && ['PENDING', 'APPROVED'].includes(p.status));
  }

  openPayForm(bookingId: number) {
    this.payFormBookingId.set(bookingId);
    this.payAmount = 0;
    this.payMethod = 'UPI';
    this.payRef = '';
    this.payNotes = '';
  }

  submitPayment() {
    const bookingId = this.payFormBookingId();
    if (!bookingId || this.payAmount <= 0 || !this.payMethod) return;
    this.payBusy.set(true);
    this.http.post(`${environment.apiUrl}/payments/submit`, {
      booking_id: bookingId,
      amount: this.payAmount,
      payment_method: this.payMethod,
      transaction_ref: this.payRef || null,
      notes: this.payNotes || null,
    }).subscribe({
      next: () => {
        this.payBusy.set(false);
        this.payFormBookingId.set(null);
        this.snackBar.open('Payment submitted! Owner will review and approve it.', 'Close', { duration: 3500 });
        this.reload();
      },
      error: (err) => {
        this.payBusy.set(false);
        const msg = err?.error?.error?.message || err?.error?.detail || 'Payment submission failed';
        this.snackBar.open(msg, 'Close', { duration: 3500 });
      },
    });
  }

  downloadReceipt(paymentId: number) {
    this.http.get(`${environment.apiUrl}/payments/${paymentId}/receipt`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = this.document.createElement('a');
        a.href = url;
        a.download = `receipt-${paymentId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.snackBar.open('Receipt downloaded!', 'Close', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to download receipt', 'Close', { duration: 2500 }),
    });
  }

  openVacateForm(bookingId: number) {
    this.vacateFormBookingId.set(bookingId);
    this.vacateDate = '';
    this.vacateReason = '';
    this.vacateDateError = '';
  }

  todayStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  onVacateDateChange(value: string) {
    this.vacateDate = value;
    const today = this.todayStr();
    if (!value) {
      this.vacateDateError = 'Please select a vacate date.';
    } else if (value < today) {
      this.vacateDateError = 'Vacate date cannot be in the past.';
    } else {
      this.vacateDateError = '';
    }
  }

  submitVacate() {
    const bookingId = this.vacateFormBookingId();
    if (!bookingId || !this.vacateDate) return;
    this.vacateBusy.set(true);
    this.http.post(`${environment.apiUrl}/vacate/`, {
      booking_id: bookingId,
      requested_vacate_date: this.vacateDate,
      reason: this.vacateReason || null,
    }).subscribe({
      next: () => {
        this.vacateBusy.set(false);
        this.vacateFormBookingId.set(null);
        this.vacateDate = '';
        this.vacateReason = '';
        this.vacateDateError = '';
        this.snackBar.open('Vacate notice submitted. Owner will review shortly.', 'Close', { duration: 3500 });
        this.reload();
      },
      error: (err) => {
        this.vacateBusy.set(false);
        const msg = err?.error?.error?.message || err?.error?.detail || 'Failed to submit vacate notice';
        this.snackBar.open(msg, 'Close', { duration: 3500 });
      },
    });
  }

  markRead(id: number) {
    this.http.patch(`${environment.apiUrl}/notifications/${id}/read`, {}).subscribe({
      next: () => {
        this.snackBar.open('Marked as read', 'Close', { duration: 1500 });
        this.reload();
      },
      error: () => {},
    });
  }
}
