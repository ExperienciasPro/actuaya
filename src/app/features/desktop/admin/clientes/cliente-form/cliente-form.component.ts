import { Component, input, output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Client, ClientLocation } from '../../../../../core/models/client.model';

@Component({
  selector: 'um-cliente-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cliente-form.component.html',
  styleUrls: ['./cliente-form.component.scss']
})
export class ClienteFormComponent implements OnInit {
  client = input<Client | null>(null);
  
  save = output<Client>();
  close = output<void>();

  // Form State
  formData: Partial<Client> = {};
  locations = signal<ClientLocation[]>([]);

  ngOnInit() {
    const c = this.client();
    if (c) {
      this.formData = { ...c };
      this.locations.set([...c.locations]);
    } else {
      this.formData = {
        status: 'Activo',
        qrCode: this.generateRandomQr()
      };
      this.locations.set([{
        id: Math.random().toString(36).substring(2),
        name: 'Sede Principal',
        address: '',
        city: ''
      }]);
    }
  }

  generateRandomQr(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  regenerateQr() {
    this.formData.qrCode = this.generateRandomQr();
  }

  addLocation() {
    this.locations.update(locs => [
      ...locs,
      {
        id: Math.random().toString(36).substring(2),
        name: `Sede ${locs.length + 1}`,
        address: '',
        city: ''
      }
    ]);
  }

  removeLocation(index: number) {
    this.locations.update(locs => locs.filter((_, i) => i !== index));
  }

  onSave() {
    // Validate required
    if (!this.formData.commercialName || !this.formData.nit) {
      alert('Nombre comercial y NIT son obligatorios.');
      return;
    }

    const finalClient: Client = {
      id: this.client()?.id || Math.random().toString(36).substring(2),
      commercialName: this.formData.commercialName || '',
      legalName: this.formData.legalName || '',
      nit: this.formData.nit || '',
      contactName: this.formData.contactName || '',
      email: this.formData.email || '',
      phone: this.formData.phone || '',
      status: this.formData.status as 'Activo' | 'Inactivo' || 'Activo',
      qrCode: this.formData.qrCode || '',
      locations: this.locations(),
      createdAt: this.client()?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastVisitAt: this.client()?.lastVisitAt
    };

    this.save.emit(finalClient);
  }

  onClose() {
    this.close.emit();
  }
}
