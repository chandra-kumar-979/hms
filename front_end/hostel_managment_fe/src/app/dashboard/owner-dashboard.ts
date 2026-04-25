import { Component, Inject, PLATFORM_ID, signal, computed } from '@angular/core';
import { environment } from '../../environments/environment';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser, LowerCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [
    MatCardModule, MatButtonModule, MatIconModule, MatTabsModule, MatChipsModule,
    MatProgressSpinnerModule, MatDividerModule,
    FormsModule, MatFormFieldModule, MatInputModule, MatListModule,
    MatSnackBarModule, MatSelectModule, MatCheckboxModule, MatTooltipModule,
    LowerCasePipe,
  ],
  styles: [`
    .page-header { margin-bottom: 1.5rem; }
    .page-header h1 { margin: 0 0 .25rem; font-size: 1.7rem; font-weight: 800; }
    .page-header p { margin: 0; color: #64748b; }

    .data-row { display: flex; align-items: center; gap: 1rem; padding: .75rem .5rem; border-bottom: 1px solid #f1f5f9; }
    .data-row:last-child { border-bottom: none; }
    .row-main { flex: 1; min-width: 0; }
    .row-label { font-weight: 600; font-size: .92rem; }
    .row-meta  { font-size: .8rem; color: #64748b; margin-top: .1rem; }
    .chip { padding: .2rem .7rem; border-radius: 20px; font-size: .75rem; font-weight: 700; }
    .chip.pending  { background: #fef9c3; color: #b45309; }
    .chip.approved { background: #dcfce7; color: #15803d; }
    .chip.rejected { background: #fee2e2; color: #b91c1c; }
    .chip.completed{ background: #e0e7ff; color: #3b5bdb; }

    .vacate-card {
      border-radius: 14px; border: 1.5px solid #e2e8f0; padding: 1.1rem 1.2rem;
      margin-bottom: .85rem; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.04);
      animation: fade-in-up .35s both;
    }
    .vacate-card.urgent { border-color: #fbbf24; background: #fffbeb; }
    .vacate-card.completed-card { border-color: #86efac; background: #f0fdf4; opacity: .75; }

    .checklist-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .2rem 1rem; }
    .vcard-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: .5rem; margin-bottom: .75rem; }
    .vcard-title  { font-weight: 700; font-size: 1rem; }
    .vcard-meta   { font-size: .82rem; color: #64748b; margin-top: .15rem; }
    .vcard-reason { font-style: italic; color: #94a3b8; font-size: .79rem; margin-top: .15rem; }

    .vstatus { display: inline-flex; align-items: center; gap: .3rem; padding: .2rem .75rem; border-radius: 20px; font-size: .78rem; font-weight: 700; }
    .vstatus.pending   { background: #fef9c3; color: #b45309; }
    .vstatus.approved  { background: #dcfce7; color: #15803d; }
    .vstatus.completed { background: #e0e7ff; color: #3b5bdb; }
    .vstatus.rejected  { background: #fee2e2; color: #b91c1c; }

    .complete-btn { background: linear-gradient(135deg, #15803d, #22c55e) !important; color: #fff !important; font-weight: 700 !important; }
    .broadcast-grid { display: grid; gap: .75rem; }
  `],
  template: `
    <div class="page-header">
      <h1>Owner Dashboard</h1>
      <p>Manage bookings, vacates, payments and broadcasts</p>
    </div>

    <!-- Stat row -->
    <div class="stat-grid" style="margin-bottom:1.5rem;">
      <div class="stat-card blue" style="animation-delay:.05s">
        <span class="stat-icon">📋</span>
        <div class="stat-value">{{ requests().length }}</div>
        <div class="stat-label">Requests</div>
        <div class="stat-sub">{{ pendingRequests() }} pending</div>
      </div>
      <div class="stat-card orange" style="animation-delay:.12s">
        <span class="stat-icon">🚪</span>
        <div class="stat-value">{{ vacateRequests().length }}</div>
        <div class="stat-label">Vacates</div>
        <div class="stat-sub">{{ pendingVacates() }} need action</div>
      </div>
      <div class="stat-card green" style="animation-delay:.19s">
        <span class="stat-icon">💳</span>
        <div class="stat-value">{{ payments().length }}</div>
        <div class="stat-label">Payments</div>
        <div class="stat-sub">recorded</div>
      </div>
    </div>

    <mat-card style="padding:0;overflow:hidden;">
      <mat-tab-group dynamicHeight>

        <!-- Booking Requests -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon style="margin-right:.35rem;font-size:1rem;">calendar_today</mat-icon>
            Requests
            @if (pendingRequests() > 0) {
              <span style="background:#ef4444;color:#fff;border-radius:20px;padding:0 6px;font-size:.7rem;margin-left:.35rem;font-weight:700;">
                {{ pendingRequests() }}
              </span>
            }
          </ng-template>
          <div style="padding:1.25rem;">
            @if (loading()) {
              <div style="text-align:center;padding:2rem;"><mat-spinner diameter="36"></mat-spinner></div>
            } @else if (!requests().length) {
              <div style="text-align:center;padding:2rem;color:#94a3b8;">
                <mat-icon style="font-size:3rem;display:block;margin:0 auto .5rem;opacity:.3">inbox</mat-icon>
                <p>No booking requests.</p>
              </div>
            }
            @for (b of requests(); track b.id) {
              <div class="data-row">
                <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#3b5bdb,#74a0f5);display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;">
                  <mat-icon style="font-size:1.1rem;">bed</mat-icon>
                </div>
                <div class="row-main">
                  <div class="row-label">Booking #{{ b.id }} · Tenant #{{ b.tenant_id }}</div>
                  <div class="row-meta">Bed {{ b.bed_id }} · {{ b.start_date }} → {{ b.end_date }}</div>
                </div>
                <div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;">
                  <span class="chip {{ b.status | lowercase }}">{{ b.status }}</span>
                  @if (b.status === 'PENDING') {
                    <button mat-flat-button style="font-size:.78rem;height:30px;line-height:30px;background:#22c55e;color:#fff;"
                      [disabled]="decisionBusyId() === b.id" (click)="decide(b.id, true)">Approve</button>
                    <button mat-stroked-button color="warn" style="font-size:.78rem;height:30px;line-height:30px;"
                      [disabled]="decisionBusyId() === b.id" (click)="decide(b.id, false)">Reject</button>
                  }
                </div>
              </div>
            }
          </div>
        </mat-tab>

        <!-- Vacate Requests tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon style="margin-right:.35rem;font-size:1rem;">exit_to_app</mat-icon>
            Vacates
            @if (pendingVacates() > 0) {
              <span style="background:#f59e0b;color:#fff;border-radius:20px;padding:0 6px;font-size:.7rem;margin-left:.35rem;font-weight:700;">
                {{ pendingVacates() }}
              </span>
            }
          </ng-template>
          <div style="padding:1.25rem;">

            <!-- Process guide -->
            <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:14px;padding:1rem 1.25rem;margin-bottom:1.25rem;border-left:4px solid #22c55e;">
              <div style="font-weight:700;color:#14532d;margin-bottom:.4rem;">🏠 Owner Pre-Departure Checklist</div>
              <div style="font-size:.83rem;color:#166534;line-height:1.8;">
                Before marking a vacate complete, ensure all 4 items below are ticked:
                <strong>Dues cleared · Room inspected · Deposit refunded · Keys returned</strong>
              </div>
            </div>

            @if (!vacateRequests().length) {
              <div style="text-align:center;padding:2rem;color:#94a3b8;">
                <mat-icon style="font-size:3rem;display:block;margin:0 auto .5rem;opacity:.3">door_front</mat-icon>
                <p>No vacate requests yet.</p>
              </div>
            }

            @for (v of vacateRequests(); track v.id) {
              <div class="vacate-card"
                [class.urgent]="v.status === 'PENDING'"
                [class.completed-card]="v.status === 'COMPLETED'">

                <div class="vcard-header">
                  <div>
                    <div class="vcard-title">Vacate #{{ v.id }} · Tenant #{{ v.tenant_id }}</div>
                    <div class="vcard-meta">Booking #{{ v.booking_id }} · Planned departure: <strong>{{ v.requested_vacate_date }}</strong></div>
                    @if (v.reason) { <div class="vcard-reason">"{{ v.reason }}"</div> }
                  </div>
                  <span class="vstatus {{ v.status | lowercase }}">
                    {{ v.status === 'PENDING' ? '⏳' : v.status === 'APPROVED' ? '✅' : v.status === 'COMPLETED' ? '🏁' : '❌' }}
                    {{ v.status }}
                  </span>
                </div>

                @if (v.status !== 'COMPLETED' && v.status !== 'REJECTED') {
                  <mat-divider style="margin-bottom:.75rem;"></mat-divider>

                  <!-- Checklist -->
                  <div style="font-size:.82rem;font-weight:700;color:#374151;margin-bottom:.5rem;">Pre-Departure Checklist</div>
                  <div class="checklist-grid" style="margin-bottom:.85rem;">
                    <mat-checkbox
                      [checked]="v.dues_cleared"
                      (change)="updateChecklist(v.id, 'dues_cleared', $event.checked)"
                      [disabled]="checklistBusyId() === v.id">
                      Dues cleared
                    </mat-checkbox>
                    <mat-checkbox
                      [checked]="v.inspection_done"
                      (change)="updateChecklist(v.id, 'inspection_done', $event.checked)"
                      [disabled]="checklistBusyId() === v.id">
                      Room inspected
                    </mat-checkbox>
                    <mat-checkbox
                      [checked]="v.deposit_refunded"
                      (change)="updateChecklist(v.id, 'deposit_refunded', $event.checked)"
                      [disabled]="checklistBusyId() === v.id">
                      Deposit refunded
                    </mat-checkbox>
                    <mat-checkbox
                      [checked]="v.keys_returned"
                      (change)="updateChecklist(v.id, 'keys_returned', $event.checked)"
                      [disabled]="checklistBusyId() === v.id">
                      Keys returned
                    </mat-checkbox>
                  </div>

                  <!-- Owner notes -->
                  <div style="display:flex;gap:.6rem;align-items:center;margin-bottom:.75rem;">
                    <input
                      [id]="'note-' + v.id"
                      style="flex:1;padding:.45rem .65rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:.83rem;outline:none;"
                      placeholder="Add a note for the tenant…"
                      [value]="v.owner_notes || ''"
                      (blur)="saveNote(v.id, $any($event.target).value)" />
                  </div>

                  <div style="display:flex;gap:.65rem;flex-wrap:wrap;">
                    @if (v.status === 'PENDING') {
                      <button mat-flat-button style="background:#3b5bdb;color:#fff;"
                        [disabled]="checklistBusyId() === v.id"
                        (click)="approveVacate(v.id)">
                        ✅ Approve Notice
                      </button>
                    }
                    <button mat-flat-button class="complete-btn"
                      [disabled]="completeBusyId() === v.id || !allChecked(v)"
                      [matTooltip]="!allChecked(v) ? 'Complete all 4 checklist items first' : ''"
                      (click)="completeVacate(v.id)">
                      {{ completeBusyId() === v.id ? 'Processing…' : '🏁 Mark Complete & Release Bed' }}
                    </button>
                    <button mat-stroked-button color="warn"
                      [disabled]="checklistBusyId() === v.id"
                      (click)="rejectVacate(v.id)">Reject</button>
                  </div>
                }

                @if (v.status === 'COMPLETED') {
                  <div style="background:#dcfce7;border-radius:10px;padding:.5rem .75rem;font-size:.82rem;color:#15803d;font-weight:600;margin-top:.5rem;">
                    🏁 Vacate completed · Bed has been released for new bookings.
                  </div>
                }
              </div>
            }
          </div>
        </mat-tab>

        <!-- Payments tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon style="margin-right:.35rem;font-size:1rem;">payments</mat-icon>
            Payments
            @if (pendingPaymentsCount() > 0) {
              <span style="background:#ef4444;color:#fff;border-radius:20px;padding:0 6px;font-size:.7rem;margin-left:.35rem;font-weight:700;">{{ pendingPaymentsCount() }}</span>
            }
          </ng-template>
          <div style="padding:1.25rem;">

            <!-- Payment day settings per hostel -->
            <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:14px;padding:1rem 1.25rem;margin-bottom:1.25rem;border-left:4px solid #3b5bdb;">
              <div style="font-weight:700;color:#1e3a8a;margin-bottom:.75rem;display:flex;align-items:center;gap:.4rem;">
                <mat-icon style="font-size:1rem;">event</mat-icon> Rent Due Day Settings
              </div>
              @for (h of myHostels(); track h.id) {
                <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.5rem;flex-wrap:wrap;">
                  <span style="font-weight:600;font-size:.88rem;min-width:140px;">{{ h.name }}</span>
                  <mat-form-field appearance="outline" style="width:130px;flex-shrink:0;">
                    <mat-label>Due Day (1–28)</mat-label>
                    <input matInput type="number" min="1" max="28"
                      [value]="h.payment_day || ''"
                      #pdInput />
                  </mat-form-field>
                  <button mat-stroked-button style="height:40px;"
                    (click)="setPaymentDay(h.id, +pdInput.value)">
                    <mat-icon style="font-size:.9rem;">save</mat-icon> Save
                  </button>
                  @if (h.payment_day) {
                    <span style="font-size:.8rem;color:#15803d;background:#dcfce7;padding:.2rem .6rem;border-radius:20px;">
                      Due on {{ h.payment_day }}{{ h.payment_day === 1 ? 'st' : h.payment_day === 2 ? 'nd' : h.payment_day === 3 ? 'rd' : 'th' }} every month
                    </span>
                  }
                </div>
              }
              @if (!myHostels().length) {
                <p style="font-size:.85rem;color:#64748b;margin:0;">No hostels found — create one first.</p>
              }
            </div>

            <!-- Pending approvals -->
            <div style="font-weight:700;font-size:.95rem;margin-bottom:.75rem;display:flex;align-items:center;gap:.4rem;">
              <mat-icon style="color:#f59e0b;font-size:1.1rem;">pending_actions</mat-icon>
              Pending Approvals
              @if (pendingPaymentsCount() > 0) {
                <span style="background:#f59e0b;color:#fff;border-radius:20px;padding:0 7px;font-size:.75rem;font-weight:700;">{{ pendingPaymentsCount() }}</span>
              }
            </div>

            @for (p of pendingPayments(); track p.id) {
              <div style="border-radius:14px;border:1.5px solid #fbbf24;background:#fffbeb;padding:1rem 1.25rem;margin-bottom:.85rem;animation:fade-in-up .3s both;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:.5rem;">
                  <div>
                    <div style="font-weight:700;">Booking #{{ p.booking_id }} · ₹{{ p.amount }}</div>
                    <div style="font-size:.82rem;color:#64748b;margin-top:.15rem;">
                      {{ p.payment_method || p.type }} · Ref: {{ p.transaction_ref || '—' }} · {{ p.month_year }}
                    </div>
                    @if (p.tenant_notes) {
                      <div style="font-size:.8rem;color:#6366f1;margin-top:.2rem;font-style:italic;">"{{ p.tenant_notes }}"</div>
                    }
                  </div>
                  <span class="chip pending">⏳ Pending</span>
                </div>
                <div style="display:flex;gap:.6rem;margin-top:.75rem;flex-wrap:wrap;align-items:center;">
                  <input style="flex:1;min-width:160px;padding:.35rem .6rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:.82rem;"
                    placeholder="Remarks (optional)" #remarkInput />
                  <button mat-flat-button style="background:#22c55e!important;color:#fff!important;height:36px;"
                    [disabled]="approveBusyId() === p.id"
                    (click)="approvePayment(p.id, true, remarkInput.value)">
                    ✅ {{ approveBusyId() === p.id ? 'Saving…' : 'Approve' }}
                  </button>
                  <button mat-stroked-button color="warn" style="height:36px;"
                    [disabled]="approveBusyId() === p.id"
                    (click)="approvePayment(p.id, false, remarkInput.value)">
                    ❌ Reject
                  </button>
                </div>
              </div>
            }
            @if (!pendingPaymentsCount()) {
              <div style="text-align:center;padding:1.5rem;color:#94a3b8;">
                <mat-icon style="font-size:2.5rem;display:block;margin:0 auto .5rem;opacity:.3;">check_circle</mat-icon>
                No pending payment approvals.
              </div>
            }

            <mat-divider style="margin:1.25rem 0;"></mat-divider>

            <!-- All payments list -->
            <div style="font-weight:700;font-size:.9rem;margin-bottom:.5rem;color:#374151;">All Payment History</div>
            @for (p of payments().slice(0, 20); track p.id) {
              <div class="data-row">
                <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#065f46,#34d399);display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;">
                  <mat-icon style="font-size:1rem;">receipt</mat-icon>
                </div>
                <div class="row-main">
                  <div class="row-label">₹{{ p.amount }} · Booking #{{ p.booking_id }}</div>
                  <div class="row-meta">{{ p.payment_method || p.type }} · {{ p.month_year || '—' }} · {{ p.due_date ? 'Due ' + p.due_date : '' }}</div>
                </div>
                <span class="chip {{ (p.status || '') | lowercase }}">{{ p.status }}</span>
              </div>
            }
          </div>
        </mat-tab>

        <!-- Broadcast -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon style="margin-right:.35rem;font-size:1rem;">campaign</mat-icon>
            Broadcast
          </ng-template>
          <div style="padding:1.25rem;">
            <div class="broadcast-grid">
              <mat-form-field appearance="outline">
                <mat-label>Hostel</mat-label>
                <mat-select [(ngModel)]="hostelId">
                  @for (h of myHostels(); track h.id) {
                    <mat-option [value]="h.id">{{ h.name }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Subject</mat-label>
                <input matInput [(ngModel)]="subject" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Message</mat-label>
                <textarea matInput rows="3" [(ngModel)]="message"></textarea>
              </mat-form-field>
              <button mat-flat-button (click)="broadcast()"
                [disabled]="broadcastBusy() || !hostelId || !subject.trim() || !message.trim()">
                {{ broadcastBusy() ? 'Sending…' : '📣 Send to All Tenants' }}
              </button>
            </div>
          </div>
        </mat-tab>

      </mat-tab-group>
    </mat-card>

    <div style="margin-top:1rem;">
      <button mat-stroked-button (click)="reload()" [disabled]="loading()">
        <mat-icon>refresh</mat-icon> {{ loading() ? 'Refreshing…' : 'Refresh All' }}
      </button>
    </div>
  `
})
export class OwnerDashboardComponent {
  requests       = signal<any[]>([]);
  payments       = signal<any[]>([]);
  myHostels      = signal<any[]>([]);
  vacateRequests = signal<any[]>([]);
  report         = signal<any>({});
  hostelId       = 1;
  subject        = 'General Update';
  message        = 'Please check notice board for details.';
  loading           = signal(false);
  decisionBusyId    = signal<number | null>(null);
  checklistBusyId   = signal<number | null>(null);
  completeBusyId    = signal<number | null>(null);
  broadcastBusy     = signal(false);
  private browser: boolean;

  pendingRequests      = computed(() => this.requests().filter(r => r.status === 'PENDING').length);
  pendingVacates       = computed(() => this.vacateRequests().filter(v => v.status === 'PENDING' || v.status === 'APPROVED').length);
  pendingPayments      = computed(() => this.payments().filter(p => p.status === 'PENDING'));
  pendingPaymentsCount = computed(() => this.pendingPayments().length);
  approveBusyId        = signal<number | null>(null);

  constructor(private http: HttpClient, private snackBar: MatSnackBar, @Inject(PLATFORM_ID) platformId: object) {
    this.browser = isPlatformBrowser(platformId);
    if (this.browser) this.reload();
  }

  reload() {
    this.loading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/bookings/owner/requests`).subscribe({
      next: (res) => this.requests.set(res),
      error: () => this.snackBar.open('Failed to load requests', 'Close', { duration: 2500 }),
    });
    this.http.get<any[]>(`${environment.apiUrl}/owner/hostels`).subscribe({
      next: (res) => { this.myHostels.set(res); if (!this.hostelId && res.length) this.hostelId = res[0].id; },
      error: () => {},
    });
    this.http.get<any[]>(`${environment.apiUrl}/payments/owner/overview`).subscribe({
      next: (res) => this.payments.set(res),
      error: () => {},
    });
    this.http.get<any[]>(`${environment.apiUrl}/vacate/owner/requests`).subscribe({
      next: (res) => { this.vacateRequests.set(res); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  allChecked(v: any): boolean {
    return v.dues_cleared && v.inspection_done && v.deposit_refunded && v.keys_returned;
  }

  decide(bookingId: number, approve: boolean) {
    this.decisionBusyId.set(bookingId);
    this.http.post(`${environment.apiUrl}/bookings/owner/decision`, { booking_id: bookingId, approve }).subscribe({
      next: () => { this.decisionBusyId.set(null); this.snackBar.open(`Booking ${approve ? 'approved' : 'rejected'}`, 'Close', { duration: 2000 }); this.reload(); },
      error: () => { this.decisionBusyId.set(null); this.snackBar.open('Decision failed', 'Close', { duration: 2500 }); },
    });
  }

  updateChecklist(vacateId: number, field: string, value: boolean) {
    this.checklistBusyId.set(vacateId);
    this.http.patch(`${environment.apiUrl}/vacate/${vacateId}`, { [field]: value }).subscribe({
      next: (updated: any) => {
        this.checklistBusyId.set(null);
        this.vacateRequests.update(list => list.map(v => v.id === vacateId ? { ...v, ...updated } : v));
      },
      error: () => { this.checklistBusyId.set(null); this.snackBar.open('Update failed', 'Close', { duration: 2000 }); },
    });
  }

  saveNote(vacateId: number, note: string) {
    this.http.patch(`${environment.apiUrl}/vacate/${vacateId}`, { owner_notes: note }).subscribe({ next: () => {}, error: () => {} });
  }

  approveVacate(vacateId: number) {
    this.checklistBusyId.set(vacateId);
    this.http.patch(`${environment.apiUrl}/vacate/${vacateId}`, { status: 'APPROVED' }).subscribe({
      next: (updated: any) => {
        this.checklistBusyId.set(null);
        this.snackBar.open('Vacate notice approved', 'Close', { duration: 2000 });
        this.vacateRequests.update(list => list.map(v => v.id === vacateId ? { ...v, ...updated } : v));
      },
      error: () => { this.checklistBusyId.set(null); this.snackBar.open('Failed to approve', 'Close', { duration: 2500 }); },
    });
  }

  rejectVacate(vacateId: number) {
    this.checklistBusyId.set(vacateId);
    this.http.patch(`${environment.apiUrl}/vacate/${vacateId}`, { status: 'REJECTED' }).subscribe({
      next: (updated: any) => {
        this.checklistBusyId.set(null);
        this.snackBar.open('Vacate notice rejected', 'Close', { duration: 2000 });
        this.vacateRequests.update(list => list.map(v => v.id === vacateId ? { ...v, ...updated } : v));
      },
      error: () => { this.checklistBusyId.set(null); this.snackBar.open('Failed to reject', 'Close', { duration: 2500 }); },
    });
  }

  completeVacate(vacateId: number) {
    this.completeBusyId.set(vacateId);
    this.http.post(`${environment.apiUrl}/vacate/${vacateId}/complete`, {}).subscribe({
      next: () => {
        this.completeBusyId.set(null);
        this.snackBar.open('Vacate completed! Bed is now available.', 'Close', { duration: 3000 });
        this.reload();
      },
      error: (err) => {
        this.completeBusyId.set(null);
        const msg = err?.error?.error?.message || err?.error?.detail || 'Failed to complete vacate';
        this.snackBar.open(msg, 'Close', { duration: 3500 });
      },
    });
  }

  setPaymentDay(hostelId: number, day: number) {
    if (!day || day < 1 || day > 28) { this.snackBar.open('Enter a day between 1 and 28', 'Close', { duration: 2500 }); return; }
    this.http.post(`${environment.apiUrl}/payments/hostels/${hostelId}/payment-day`, { payment_day: day }).subscribe({
      next: () => {
        this.snackBar.open(`Payment day set to ${day}th every month`, 'Close', { duration: 2500 });
        this.myHostels.update(list => list.map(h => h.id === hostelId ? { ...h, payment_day: day } : h));
      },
      error: (err) => this.snackBar.open(err?.error?.detail || 'Failed to set payment day', 'Close', { duration: 2500 }),
    });
  }

  approvePayment(paymentId: number, approve: boolean, remarks: string) {
    this.approveBusyId.set(paymentId);
    this.http.post(`${environment.apiUrl}/payments/${paymentId}/approve`, { approve, remarks: remarks || null }).subscribe({
      next: (updated: any) => {
        this.approveBusyId.set(null);
        this.snackBar.open(`Payment ${approve ? 'approved ✅' : 'rejected ❌'}`, 'Close', { duration: 2500 });
        this.payments.update(list => list.map(p => p.id === paymentId ? { ...p, ...updated } : p));
      },
      error: (err) => {
        this.approveBusyId.set(null);
        this.snackBar.open(err?.error?.detail || 'Action failed', 'Close', { duration: 2500 });
      },
    });
  }

  broadcast() {
    this.broadcastBusy.set(true);
    this.http.post(`${environment.apiUrl}/owner/broadcast`, { hostel_id: this.hostelId, subject: this.subject, message: this.message }).subscribe({
      next: () => { this.broadcastBusy.set(false); this.snackBar.open('Broadcast sent', 'Close', { duration: 2000 }); },
      error: () => { this.broadcastBusy.set(false); this.snackBar.open('Broadcast failed', 'Close', { duration: 2500 }); },
    });
  }
}
