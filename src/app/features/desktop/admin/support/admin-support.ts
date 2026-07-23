import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupportService, SupportTicket } from '../../../../core/services/support.service';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

@Component({
  selector: 'um-admin-support',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './admin-support.html',
  styleUrls: ['./admin-support.scss'] // Reusing or linking similar SCSS
})
export class AdminSupportComponent implements OnInit {
  private support = inject(SupportService);

  tickets = signal<SupportTicket[]>([]);
  view = signal<'list' | 'detail'>('list');
  selectedTicket = signal<SupportTicket | null>(null);

  replyMessage = '';
  loading = signal(false);
  submitting = signal(false);

  ngOnInit() {
    this.loadTickets();
  }

  loadTickets() {
    this.loading.set(true);
    // Fetch all tickets for admin
    this.support.getTickets().subscribe({
      next: (data) => {
        this.tickets.set(data);
        this.loading.set(false);
        const current = this.selectedTicket();
        if (current) {
          const updated = data.find(t => t._id === current._id);
          if (updated) this.selectedTicket.set(updated);
        }
      },
      error: () => this.loading.set(false)
    });
  }

  openTicket(t: SupportTicket) {
    this.selectedTicket.set(t);
    this.view.set('detail');
  }

  goBack() {
    this.view.set('list');
    this.selectedTicket.set(null);
  }

  sendReply() {
    const t = this.selectedTicket();
    if (!t || !t._id || !this.replyMessage.trim()) return;

    this.submitting.set(true);
    this.support.replyTicket(t._id, 'admin', this.replyMessage).subscribe({
      next: (updated) => {
        this.submitting.set(false);
        this.replyMessage = '';
        this.selectedTicket.set(updated);
        this.loadTickets(); // update list
      },
      error: () => this.submitting.set(false)
    });
  }

  toggleStatus() {
    const t = this.selectedTicket();
    if (!t || !t._id) return;
    
    const newStatus = t.status === 'open' ? 'closed' : 'open';
    this.submitting.set(true);
    this.support.updateStatus(t._id, newStatus).subscribe({
      next: (updated) => {
        this.submitting.set(false);
        this.selectedTicket.set(updated);
        this.loadTickets();
      },
      error: () => this.submitting.set(false)
    });
  }
}
