import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
export interface UserProfile {
  _id: string;
  username: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | '';
  avatar?: string;
  role?: string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class Auth {
  private apiUrl = environment.apiUrl;

  private _currentUser = signal<UserProfile | null>(this._loadUser());

  constructor(private http: HttpClient) {}

  private _loadUser(): UserProfile | null {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  private _saveUser(user: UserProfile): void {
    localStorage.setItem('user', JSON.stringify(user));
    this._currentUser.set(user);
  }

  isLoggedIn(): boolean          { return !!localStorage.getItem('token'); }
  getUser():    UserProfile | null { return this._currentUser(); }
  getToken():   string | null    { return localStorage.getItem('token'); }
  get currentUser()              { return this._currentUser.asReadonly(); }

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap(res => {
        localStorage.setItem('token', res.token);
        this._saveUser(res.user);
      })
    );
  }

  register(username: string, email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/register`, { username, email, password });
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this._currentUser.set(null);
  }

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/auth/me`).pipe(
      tap(user => this._saveUser(user))
    );
  }

  updateProfile(data: Partial<Pick<UserProfile, 'username' | 'phone' | 'dateOfBirth' | 'gender'>>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/auth/update-profile`, data).pipe(
      tap(res => { if (res.user) this._saveUser(res.user); })
    );
  }

  uploadAvatar(file: File): Observable<any> {
    const fd = new FormData();
    fd.append('avatar', file);
    return this.http.post<any>(`${this.apiUrl}/auth/avatar`, fd).pipe(
      tap(res => { if (res.user) this._saveUser(res.user); })
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/auth/change-password`, { oldPassword: currentPassword, newPassword });
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/reset-password`, { token, newPassword });
  }
}