import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClientService } from '../../../../../core/services/client.service';
import { Client } from '../../../../../core/models/client.model';
import { ClienteFormComponent } from '../cliente-form/cliente-form.component';

@Component({
  selector: 'um-clientes-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ClienteFormComponent],
  templateUrl: './clientes-list.component.html',
  styleUrls: ['./clientes-list.component.scss']
})
export class ClientesListComponent {
  private clientService = inject(ClientService);

  searchQuery = signal('');
  showForm = signal(false);
  editingClient = signal<Client | null>(null);

  clients = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const all = this.clientService.clients();
    if (!query) return all;
    return all.filter(c => 
      c.commercialName.toLowerCase().includes(query) ||
      c.legalName.toLowerCase().includes(query) ||
      c.nit.toLowerCase().includes(query) ||
      c.contactName.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query)
    );
  });

  openForm(client?: Client) {
    this.editingClient.set(client || null);
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingClient.set(null);
  }

  saveClient(client: Client) {
    if (this.editingClient()) {
      this.clientService.updateClient(client);
    } else {
      this.clientService.addClient(client);
    }
    this.closeForm();
  }

  deleteClient(id: string) {
    if (confirm('¿Estás seguro de eliminar este cliente?')) {
      this.clientService.deleteClient(id);
    }
  }

  getMainAddress(client: Client): string {
    if (client.locations && client.locations.length > 0) {
      const loc = client.locations[0];
      let addr = loc.address;
      if (loc.name) addr += ` (${loc.name})`;
      if (loc.city) addr += `, ${loc.city}`;
      return addr;
    }
    return 'Sin sede asignada';
  }
}
