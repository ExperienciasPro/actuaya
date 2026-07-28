import { Component, computed, inject } from '@angular/core';
import { UserService } from '../../../core/services/user.service';
import { PosComponent } from '../pos/pos';
import { PosGastroComponent } from '../pos-gastro/pos-gastro';

@Component({
  selector: 'um-pos-router',
  standalone: true,
  imports: [PosComponent, PosGastroComponent],
  template: `
    @if (posMode() === 'gastronomy') {
      <um-pos-gastro />
    } @else {
      <um-pos />
    }
  `
})
export class PosRouterComponent {
  private user = inject(UserService);
  
  posMode = computed(() => this.user.profile()?.posMode || 'retail');
}
