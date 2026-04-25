import { Component, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-admin-owner-management',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatListModule, MatSnackBarModule],
  templateUrl: './admin-owner-management.html'
})
export class AdminOwnerManagementComponent {
  owners = signal<any[]>([]);
  name = '';
  email = '';
  phone = '';
  message = signal('');
  loading = signal(false);
  addBusy = signal(false);
  deleteBusyId = signal<number | null>(null);

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {
    this.reload();
  }

  reload() {
    this.loading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/admin/owners`).subscribe({
      next: (res) => {
        this.owners.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to load owners', 'Close', { duration: 2500 });
      },
    });
  }

  addOwner() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.name.trim() || !emailRegex.test(this.email.trim()) || this.addBusy()) {
      this.snackBar.open('Enter valid owner name and email', 'Close', { duration: 2500 });
      return;
    }
    this.addBusy.set(true);
    this.http.post(`${environment.apiUrl}/admin/owners`, { name: this.name, email: this.email, phone: this.phone }).subscribe({
      next: () => {
        this.addBusy.set(false);
        this.message.set('Owner added');
        this.snackBar.open('Owner added', 'Close', { duration: 2000 });
        this.name = '';
        this.email = '';
        this.phone = '';
        this.reload();
      },
      error: (e) => {
        this.addBusy.set(false);
        this.message.set(e?.error?.detail ?? 'Add owner failed');
        this.snackBar.open(this.message() || 'Add owner failed', 'Close', { duration: 2500 });
      },
    });
  }

  deleteOwner(id: number) {
    if (this.deleteBusyId() !== null) return;
    this.deleteBusyId.set(id);
    this.http.delete(`${environment.apiUrl}/admin/owners/${id}`).subscribe({
      next: () => {
        this.deleteBusyId.set(null);
        this.snackBar.open('Owner deleted', 'Close', { duration: 2000 });
        this.reload();
      },
      error: () => {
        this.deleteBusyId.set(null);
        this.snackBar.open('Delete owner failed', 'Close', { duration: 2500 });
      },
    });
  }
}
