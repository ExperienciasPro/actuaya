import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarUtils } from '../../utils/avatar.utils';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar.component.html',
  styleUrl: './avatar.component.css'
})
export class AvatarComponent implements OnChanges {
  @Input() seed: string = 'Felix';
  @Input() type: 'person' | 'instrument' = 'person';
  @Input() extraParams: string = '';
  avatarUrl: string = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['seed']) {
      this.generateUrl();
    }
  }

  private generateUrl(): void {
    this.avatarUrl = AvatarUtils.getDiceBearUrl(this.seed, this.type, this.extraParams);
  }
}
