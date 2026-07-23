import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupportService, SupportTicket } from '../../../core/services/support.service';
import { StorageService } from '../../../core/services/storage.service';
import { UserService } from '../../../core/services/user.service';
import { UmIconComponent } from '../../../shared/components/um-icon/um-icon';

type ViewMode = 'list' | 'create' | 'detail';

@Component({
  selector: 'um-user-support',
  standalone: true,
  imports: [CommonModule, FormsModule, UmIconComponent],
  templateUrl: './support.html',
  styleUrls: ['./support.scss']
})
export class UserSupportComponent implements OnInit {
  private support = inject(SupportService);
  private storage = inject(StorageService);
  private userService = inject(UserService);

  tickets = signal<SupportTicket[]>([]);
  view = signal<ViewMode>('list');
  selectedTicket = signal<SupportTicket | null>(null);

  // Create form
  newSubject = '';
  newDescription = '';
  newScreenshot = '';

  // Reply form
  replyMessage = '';

  loading = signal(false);
  submitting = signal(false);

  ngOnInit() {
    this.loadTickets();
  }

  loadTickets() {
    const userId = this.storage.getActiveUserId();
    if (!userId) return;

    this.loading.set(true);
    this.support.getTickets(userId).subscribe({
      next: (data) => {
        this.tickets.set(data);
        this.loading.set(false);
        // Refresh selected ticket if any
        const current = this.selectedTicket();
        if (current) {
          const updated = data.find(t => t._id === current._id);
          if (updated) this.selectedTicket.set(updated);
        }
      },
      error: () => this.loading.set(false)
    });
  }

  openCreate() {
    this.newSubject = '';
    this.newDescription = '';
    this.newScreenshot = '';
    this.view.set('create');
  }

  openTicket(t: SupportTicket) {
    this.selectedTicket.set(t);
    this.view.set('detail');
  }

  goBack() {
    this.view.set('list');
    this.selectedTicket.set(null);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no puede pesar más de 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.newScreenshot = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  submitTicket() {
    if (!this.newSubject.trim() || !this.newDescription.trim()) return;

    const userId = this.storage.getActiveUserId();
    const user = this.userService.profile();
    if (!userId) return;

    this.submitting.set(true);
    this.support.createTicket({
      userId,
      userName: user?.name || user?.email || 'Usuario',
      userEmail: user?.email,
      subject: this.newSubject,
      description: this.newDescription,
      screenshot: this.newScreenshot
    }).subscribe({
      next: (t) => {
        this.submitting.set(false);
        this.loadTickets();
        this.openTicket(t);
      },
      error: () => this.submitting.set(false)
    });
  }

  sendReply() {
    const t = this.selectedTicket();
    if (!t || !t._id || !this.replyMessage.trim()) return;

    this.submitting.set(true);
    this.support.replyTicket(t._id, 'user', this.replyMessage).subscribe({
      next: (updated) => {
        this.submitting.set(false);
        this.replyMessage = '';
        this.selectedTicket.set(updated);
        this.loadTickets(); // update list
      },
      error: () => this.submitting.set(false)
    });
  }
}
