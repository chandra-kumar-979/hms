import { Component, signal, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { environment } from '../../environments/environment';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-tenant-booking',
  standalone: true,
  imports: [
    FormsModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatDividerModule, MatChipsModule, MatSnackBarModule, MatTooltipModule, RouterLink,
  ],
  templateUrl: './tenant-booking.html',
  styleUrls: ['./tenant-booking.scss'],
})
export class TenantBookingComponent implements OnInit {
  // Hostel context (passed via query params from the hostel card)
  hostelId     = signal<number | null>(null);
  hostelIdModel: number | null = null; // two-way binding for the dropdown fallback
  hostelName   = signal('');
  hostelLoc    = signal('');
  hostelPrice  = signal<number | null>(null);
  hostelAmenities = signal<string[]>([]);

  // All hostels for the fallback dropdown (used when navigating directly)
  allHostels = signal<any[]>([]);

  beds         = signal<any[]>([]);
  selectedBed?: number;
  startDate    = '';
  endDate      = '';
  message      = signal('');
  loading      = signal(false);
  bookingBusy  = signal(false);
  success      = signal(false);
  fromCard     = signal(false); // true when hostelId came via query param

  get today(): string { return new Date().toISOString().split('T')[0]; }
  get minEndDate(): string { return this.startDate && this.startDate >= this.today ? this.startDate : this.today; }
  get dateError(): string | null {
    if (this.startDate && this.startDate < this.today) return 'Check-in cannot be in the past.';
    if (this.endDate && this.startDate && this.endDate < this.startDate) return 'Check-out must be after check-in.';
    if (this.endDate && this.endDate < this.today) return 'Check-out cannot be in the past.';
    return null;
  }

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.route.queryParams.subscribe((params) => {
      const id   = params['hostelId']   ? +params['hostelId'] : null;
      const name = params['hostelName'] ?? '';
      const loc  = params['location']   ?? '';
      const price = params['price']     ? +params['price']   : null;
      const amenities = params['amenities'] ? params['amenities'].split(',') : [];

      // Always reset form state on navigation to avoid stale dates/selections
      this.startDate = '';
      this.endDate = '';
      this.selectedBed = undefined;
      this.success.set(false);
      this.message.set('');

      this.hostelId.set(id);
      this.hostelName.set(name);
      this.hostelLoc.set(loc);
      this.hostelPrice.set(price);
      this.hostelAmenities.set(amenities);
      this.fromCard.set(!!id);

      if (id) {
        this.loadBeds(id);
      } else {
        // No hostel pre-selected — load all hostels for the dropdown
        this.http.get<any[]>(`${environment.apiUrl}/hostels/`).subscribe({
          next: (res) => this.allHostels.set(res),
          error: () => {},
        });
      }
    });
  }

  loadBeds(id?: number) {
    const target = id ?? this.hostelId();
    if (!target) return;
    this.hostelId.set(target);
    this.beds.set([]);
    this.selectedBed = undefined;
    this.loading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/hostels/${target}/beds/available`).subscribe({
      next: (res) => { this.beds.set(res); this.loading.set(false); },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to load available beds', 'Close', { duration: 2500 });
      },
    });
  }

  onHostelDropdownChange() {
    const h = this.allHostels().find(x => x.id === this.hostelIdModel);
    if (h) {
      this.hostelName.set(h.name);
      this.hostelLoc.set(h.location);
      this.hostelPrice.set(h.price_per_bed);
      this.hostelAmenities.set(h.amenities ?? []);
    }
    // Reset dates and bed selection when hostel changes
    this.startDate = '';
    this.endDate = '';
    this.selectedBed = undefined;
    this.loadBeds();
  }

  onStartDateChange() {
    // If existing end date is now invalid, clear it
    if (this.endDate && this.endDate < this.startDate) {
      this.endDate = '';
    }
  }

  requestBooking() {
    if (!this.selectedBed || !this.startDate || !this.endDate || this.endDate < this.startDate || this.bookingBusy()) {
      this.snackBar.open('Choose a bed and valid date range', 'Close', { duration: 2500 });
      return;
    }
    this.bookingBusy.set(true);
    this.http.post(`${environment.apiUrl}/bookings/`, {
      bed_id: this.selectedBed,
      start_date: this.startDate,
      end_date: this.endDate,
    }).subscribe({
      next: () => {
        this.bookingBusy.set(false);
        this.success.set(true);
        this.message.set('');
        this.snackBar.open('🎉 Booking request submitted!', 'Close', { duration: 3000 });
        // Reload beds so the booked bed disappears
        setTimeout(() => this.loadBeds(), 1000);
        this.selectedBed = undefined;
        this.startDate = '';
        this.endDate = '';
      },
      error: (e) => {
        this.bookingBusy.set(false);
        this.success.set(false);
        const msg = e?.error?.error?.message ?? e?.error?.detail ?? 'Booking failed';
        this.message.set(msg);
        this.snackBar.open(msg, 'Close', { duration: 3500 });
      },
    });
  }

  backToHostels() {
    this.router.navigate(['/']);
  }
}
