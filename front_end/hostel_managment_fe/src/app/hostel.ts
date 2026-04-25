import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { HttpClient } from '@angular/common/http';
import { HttpParams } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class HostelService {
  API = `${environment.apiUrl}/hostels`;

  constructor(private http: HttpClient) {}

  getAll(filters?: { location?: string; min_price?: number; max_price?: number; min_rating?: number }) {
    let params = new HttpParams();
    if (filters?.location) params = params.set('location', filters.location);
    if (filters?.min_price !== undefined) params = params.set('min_price', filters.min_price);
    if (filters?.max_price !== undefined) params = params.set('max_price', filters.max_price);
    if (filters?.min_rating !== undefined) params = params.set('min_rating', filters.min_rating);
    return this.http.get(this.API, { params });
  }

  getDetails(id: number) {
    return this.http.get(`${this.API}/${id}`);
  }
}
