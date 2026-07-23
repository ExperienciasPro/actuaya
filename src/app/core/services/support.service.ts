import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { StorageService } from './storage.service';
import { Observable } from 'rxjs';

export interface TicketReply {
  _id?: string;
  sender: 'user' | 'admin';
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  _id?: string;
  userId: string;
  userName: string;
  userEmail?: string;
  subject: string;
  description: string;
  screenshot?: string;
  status: 'open' | 'closed';
  replies: TicketReply[];
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class SupportService {
  private http = inject(HttpClient);
  private storage = inject(StorageService);

  // We use the shared token from env
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'X-Auth-Token': environment.authToken || 'um_api_2026'
    });
  }

  // Get tickets for a specific user (or all if no userId is passed, for Admin)
  getTickets(userId?: string): Observable<SupportTicket[]> {
    let url = `${environment.apiUrl}/support`;
    if (userId) {
      url += `?userId=${userId}`;
    }
    return this.http.get<SupportTicket[]>(url, { headers: this.getHeaders() });
  }

  // Create a new ticket
  createTicket(payload: Partial<SupportTicket>): Observable<SupportTicket> {
    return this.http.post<SupportTicket>(`${environment.apiUrl}/support`, payload, { headers: this.getHeaders() });
  }

  // Reply to a ticket
  replyTicket(ticketId: string, sender: 'user' | 'admin', message: string): Observable<SupportTicket> {
    return this.http.post<SupportTicket>(
      `${environment.apiUrl}/support/${ticketId}/reply`,
      { sender, message },
      { headers: this.getHeaders() }
    );
  }

  // Update status
  updateStatus(ticketId: string, status: 'open' | 'closed'): Observable<SupportTicket> {
    return this.http.put<SupportTicket>(
      `${environment.apiUrl}/support/${ticketId}/status`,
      { status },
      { headers: this.getHeaders() }
    );
  }
}
