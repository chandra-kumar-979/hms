import { Component, signal, OnInit } from '@angular/core';
import { HostelService } from '../hostel';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

interface Hostel {
  id: number;
  name: string;
  location: string;
  rating?: number;
  price_per_bed?: number;
  amenities?: string[];
  images?: string[];
}

@Component({
  selector: 'app-hostel-list',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatChipsModule, MatFormFieldModule, MatInputModule, MatSelectModule, FormsModule],
  templateUrl: './hostel-list.html',
  styleUrls: ['./hostel-list.scss']
})
export class HostelListComponent implements OnInit {
  hostels = signal<Hostel[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  location = '';
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;

  constructor(private hostelService: HostelService) {}

  ngOnInit() {
    this.loadHostels();
  }

  loadHostels() {
    this.loading.set(true);
    this.error.set(null);
    this.hostelService
      .getAll({
        location: this.location || undefined,
        min_price: this.minPrice,
        max_price: this.maxPrice,
        min_rating: this.minRating,
      })
      .pipe(
        catchError((err) => {
          this.error.set(err?.message ?? 'Failed to load hostels. Is the backend running on port 8000?');
          return of([]);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe((res: any) => {
        this.hostels.set(res ?? []);
      });
  }

  resetFilters() {
    this.location = '';
    this.minPrice = undefined;
    this.maxPrice = undefined;
    this.minRating = undefined;
    this.loadHostels();
  }

  starsArr(rating: number): number[] {
    return Array(Math.min(Math.max(Math.round(rating), 0), 5)).fill(0);
  }

  emptyStarsArr(rating: number): number[] {
    return Array(5 - Math.min(Math.max(Math.round(rating), 0), 5)).fill(0);
  }
}
