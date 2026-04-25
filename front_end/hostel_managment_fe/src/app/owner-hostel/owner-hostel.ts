import { Component, signal, ViewChild, computed } from '@angular/core';
import { environment } from '../../environments/environment';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

const API = environment.apiUrl;

@Component({
  selector: 'app-owner-hostel',
  standalone: true,
  imports: [
    FormsModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatSnackBarModule, MatStepperModule, MatIconModule,
    MatSelectModule, MatChipsModule, MatExpansionModule, MatProgressBarModule,
    MatTooltipModule, MatDividerModule,
  ],
  templateUrl: './owner-hostel.html',
  styleUrls: ['./owner-hostel.scss'],
})
export class OwnerHostelComponent {
  @ViewChild('stepper') stepper!: MatStepper;

  // ── Data ──────────────────────────────────────────────────────────────────
  hostels = signal<any[]>([]);
  floors  = signal<any[]>([]);   // floors for the selected hostel
  rooms   = signal<any[]>([]);   // rooms for the selected floor
  loading = signal(false);

  // ── Step 1: Hostel ────────────────────────────────────────────────────────
  name        = '';
  description = '';
  location    = '';
  price       = 0;
  amenities   = '';
  addHostelBusy = signal(false);

  // ── Step 2: Floor ─────────────────────────────────────────────────────────
  floorNumber?: number;
  addFloorBusy = signal(false);

  // ── Step 3: Room ──────────────────────────────────────────────────────────
  selectedFloorId?: number;  // chosen from dropdown in step 3
  roomNumber?: number;
  roomType = 'DOUBLE';
  addRoomBusy = signal(false);

  // ── Step 4: Bed ───────────────────────────────────────────────────────────
  selectedRoomId?: number;   // chosen from dropdown in step 4
  bedNumber?: number;
  addBedBusy = signal(false);
  bedsAdded  = signal(0);    // counter per room session

  // ── Edit hostel ───────────────────────────────────────────────────────────
  editingId?:      number;
  editName        = '';
  editDescription = '';
  editLocation    = '';
  editPrice       = 0;
  editAmenities   = '';
  editBusy        = signal(false);
  deleteBusyId    = signal<number | null>(null);

  // ── Hierarchy chain ───────────────────────────────────────────────────────
  chainHostel = signal<{ id: number; name: string; location: string } | null>(null);
  chainFloor  = signal<{ id: number; number: number } | null>(null);
  chainRoom   = signal<{ id: number; number: number; type: string } | null>(null);
  chainBed    = signal<{ id: number; number: number } | null>(null);

  roomTypes = ['SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD', 'DORMITORY'];

  floorLabel  = computed(() => this.floors().find(f => f.id === this.selectedFloorId)?.floor_number ?? '');
  roomLabel   = computed(() => this.rooms().find(r => r.id === this.selectedRoomId));

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {
    this.reload();
  }

  reload() {
    this.loading.set(true);
    this.http.get<any[]>(`${API}/owner/hostels`).subscribe({
      next: (res) => { this.hostels.set(res); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('Failed to load hostels', 'Close', { duration: 2500 }); },
    });
  }

  private loadFloors(hostelId: number) {
    this.http.get<any[]>(`${API}/hostels/${hostelId}/floors`).subscribe({
      next: (res) => {
        this.floors.set(res);
        if (res.length === 1) this.selectedFloorId = res[0].id;
      },
      error: () => {},
    });
  }

  private loadRooms(floorId: number) {
    this.http.get<any[]>(`${API}/hostels/floors/${floorId}/rooms`).subscribe({
      next: (res) => {
        this.rooms.set(res);
        if (res.length === 1) this.selectedRoomId = res[0].id;
      },
      error: () => {},
    });
  }

  // ── Step 1 ────────────────────────────────────────────────────────────────
  addHostel() {
    if (!this.name.trim() || !this.location.trim() || this.price < 0 || this.addHostelBusy()) {
      this.snackBar.open('Enter hostel name, location and a valid price', 'Close', { duration: 2500 });
      return;
    }
    const form = new FormData();
    form.append('name', this.name);
    form.append('description', this.description);
    form.append('location', this.location);
    form.append('price_per_bed', `${this.price}`);
    form.append('amenities', this.amenities);
    this.addHostelBusy.set(true);
    this.http.post<any>(`${API}/hostels/`, form).subscribe({
      next: (res) => {
        this.addHostelBusy.set(false);
        this.snackBar.open('✔ Hostel created!', 'Close', { duration: 2000 });
        this.chainHostel.set({ id: res.id, name: res.name, location: res.location });
        this.chainFloor.set(null); this.chainRoom.set(null); this.chainBed.set(null);
        this.floors.set([]); this.rooms.set([]);
        this.name = ''; this.description = ''; this.location = ''; this.price = 0; this.amenities = '';
        this.reload();
        setTimeout(() => this.stepper?.next(), 320);
      },
      error: (e) => {
        this.addHostelBusy.set(false);
        this.snackBar.open(e?.error?.detail ?? 'Hostel create failed', 'Close', { duration: 2500 });
      },
    });
  }

  selectHostelForChain(h: any) {
    this.chainHostel.set({ id: h.id, name: h.name, location: h.location });
    this.chainFloor.set(null); this.chainRoom.set(null); this.chainBed.set(null);
    this.floors.set([]); this.rooms.set([]);
    this.floorNumber = undefined;
    this.loadFloors(h.id);
    this.snackBar.open(`"${h.name}" selected – now add a floor`, 'OK', { duration: 2000 });
    setTimeout(() => this.stepper?.next(), 250);
  }

  // ── Step 2 ────────────────────────────────────────────────────────────────
  addFloor() {
    const hostelId = this.chainHostel()?.id;
    if (!hostelId || !this.floorNumber || this.floorNumber < 0 || this.addFloorBusy()) return;
    this.addFloorBusy.set(true);
    this.http.post<any>(`${API}/hostels/floors`, {
      hostel_id: hostelId,
      floor_number: this.floorNumber,
      images: [],
    }).subscribe({
      next: (res) => {
        this.addFloorBusy.set(false);
        this.snackBar.open(`✔ Floor ${this.floorNumber} added!`, 'Close', { duration: 2000 });
        this.chainFloor.set({ id: res.id, number: this.floorNumber! });
        this.chainRoom.set(null); this.chainBed.set(null);
        this.selectedFloorId = res.id;
        this.floorNumber = undefined;
        this.loadFloors(hostelId);  // refresh floor list
      },
      error: () => { this.addFloorBusy.set(false); this.snackBar.open('Add floor failed', 'Close', { duration: 2500 }); },
    });
  }

  goToRooms() {
    if (!this.chainFloor()) { this.snackBar.open('Add at least one floor first', 'Close', { duration: 2000 }); return; }
    this.loadRooms(this.chainFloor()!.id);
    setTimeout(() => this.stepper?.next(), 100);
  }

  // ── Step 3 ────────────────────────────────────────────────────────────────
  onFloorSelect(floorId: number) {
    this.selectedFloorId = floorId;
    const floor = this.floors().find(f => f.id === floorId);
    if (floor) this.chainFloor.set({ id: floor.id, number: floor.floor_number });
    this.chainRoom.set(null); this.chainBed.set(null);
    this.loadRooms(floorId);
  }

  addRoom() {
    if (!this.selectedFloorId || !this.roomNumber || this.roomNumber < 1 || !this.roomType || this.addRoomBusy()) return;
    this.addRoomBusy.set(true);
    this.http.post<any>(`${API}/hostels/rooms`, {
      floor_id: this.selectedFloorId,
      room_number: this.roomNumber,
      room_type: this.roomType,
      images: [],
    }).subscribe({
      next: (res) => {
        this.addRoomBusy.set(false);
        this.snackBar.open(`✔ Room ${this.roomNumber} added!`, 'Close', { duration: 2000 });
        this.chainRoom.set({ id: res.id, number: this.roomNumber!, type: this.roomType });
        this.chainBed.set(null);
        this.selectedRoomId = res.id;
        this.roomNumber = undefined;
        this.loadRooms(this.selectedFloorId!);  // refresh room list
      },
      error: () => { this.addRoomBusy.set(false); this.snackBar.open('Add room failed', 'Close', { duration: 2500 }); },
    });
  }

  goToBeds() {
    if (!this.chainRoom()) { this.snackBar.open('Add at least one room first', 'Close', { duration: 2000 }); return; }
    setTimeout(() => this.stepper?.next(), 100);
  }

  // ── Step 4 ────────────────────────────────────────────────────────────────
  onRoomSelect(roomId: number) {
    this.selectedRoomId = roomId;
    const room = this.rooms().find(r => r.id === roomId);
    if (room) this.chainRoom.set({ id: room.id, number: room.room_number, type: room.room_type });
    this.chainBed.set(null);
    this.bedsAdded.set(0);
  }

  addBed() {
    if (!this.selectedRoomId || !this.bedNumber || this.bedNumber < 1 || this.addBedBusy()) return;
    this.addBedBusy.set(true);
    this.http.post<any>(`${API}/hostels/beds`, {
      room_id: this.selectedRoomId,
      bed_number: this.bedNumber,
      status: 'AVAILABLE',
    }).subscribe({
      next: (res) => {
        this.addBedBusy.set(false);
        this.snackBar.open(`✔ Bed ${this.bedNumber} added!`, 'Close', { duration: 2000 });
        this.chainBed.set({ id: res.id, number: this.bedNumber! });
        this.bedsAdded.update(n => n + 1);
        this.bedNumber = undefined;
      },
      error: () => { this.addBedBusy.set(false); this.snackBar.open('Add bed failed', 'Close', { duration: 2500 }); },
    });
  }

  // ── Hostel edit / delete ─────────────────────────────────────────────────
  deleteHostel(id: number) {
    if (this.deleteBusyId() !== null) return;
    this.deleteBusyId.set(id);
    this.http.delete(`${API}/hostels/${id}`).subscribe({
      next: () => {
        this.deleteBusyId.set(null);
        this.snackBar.open('Hostel deleted', 'Close', { duration: 2000 });
        if (this.chainHostel()?.id === id) {
          this.chainHostel.set(null); this.chainFloor.set(null);
          this.chainRoom.set(null);   this.chainBed.set(null);
          this.floors.set([]); this.rooms.set([]);
        }
        this.reload();
      },
      error: () => { this.deleteBusyId.set(null); this.snackBar.open('Delete failed', 'Close', { duration: 2500 }); },
    });
  }

  startEdit(h: any) {
    this.editingId      = h.id;
    this.editName       = h.name ?? '';
    this.editDescription = h.description ?? '';
    this.editLocation   = h.location ?? '';
    this.editPrice      = h.price_per_bed ?? 0;
    this.editAmenities  = Array.isArray(h.amenities) ? h.amenities.join(', ') : '';
  }

  cancelEdit() { this.editingId = undefined; }

  saveEdit() {
    if (!this.editingId || !this.editName.trim() || !this.editLocation.trim() || this.editPrice < 0 || this.editBusy()) {
      this.snackBar.open('Fill valid edit details', 'Close', { duration: 2500 });
      return;
    }
    this.editBusy.set(true);
    this.http.patch(`${API}/hostels/${this.editingId}`, {
      name: this.editName, description: this.editDescription,
      location: this.editLocation, price_per_bed: this.editPrice,
      amenities: this.editAmenities.split(',').map(x => x.trim()).filter(Boolean),
    }).subscribe({
      next: () => {
        this.editBusy.set(false);
        this.snackBar.open('✔ Hostel updated!', 'Close', { duration: 2000 });
        this.editingId = undefined;
        this.reload();
      },
      error: () => { this.editBusy.set(false); this.snackBar.open('Update failed', 'Close', { duration: 2500 }); },
    });
  }
}
