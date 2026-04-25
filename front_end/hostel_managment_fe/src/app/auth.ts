import { Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { environment } from '../environments/environment';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { tap } from 'rxjs/operators';

type UserRole = 'TENANT' | 'OWNER' | 'ADMIN';

interface AuthResponse {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  token: string;
}

interface RegisterRequest {
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
}

interface DevLoginRequest {
  email: string;
  role: UserRole;
  name?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  API = `${environment.apiUrl}/auth`;
  token = signal<string | null>(null);
  userRole = signal<UserRole | null>(null);
  isLoggedIn = signal<boolean>(false);
  userName = signal<string | null>(null);
  private readonly isBrowser: boolean;

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      const savedToken = localStorage.getItem('token');
      const savedRole = localStorage.getItem('userRole') as UserRole | null;
      this.token.set(savedToken);
      this.userRole.set(savedRole);
      this.isLoggedIn.set(!!savedToken);
      this.userName.set(localStorage.getItem('userName'));
    }
  }

  private applyAuth(res: AuthResponse) {
    if (this.isBrowser) {
      localStorage.setItem('token', res.token);
      localStorage.setItem('userRole', res.role);
      localStorage.setItem('userName', res.name);
    }
    this.token.set(res.token);
    this.userRole.set(res.role);
    this.userName.set(res.name);
    this.isLoggedIn.set(true);
  }

  googleLogin(token: string) {
    return this.http.post<AuthResponse>(`${this.API}/google`, { token }).pipe(
      tap((res) => this.applyAuth(res))
    );
  }

  devLogin(payload: DevLoginRequest) {
    return this.http.post<AuthResponse>(`${this.API}/dev-login`, payload).pipe(
      tap((res) => this.applyAuth(res))
    );
  }

  register(payload: RegisterRequest) {
    return this.http.post<AuthResponse>(`${this.API}/register`, payload).pipe(tap((res) => this.applyAuth(res)));
  }

  logout() {
    if (this.isBrowser) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
    }
    this.token.set(null);
    this.userRole.set(null);
    this.userName.set(null);
    this.isLoggedIn.set(false);
  }
}
