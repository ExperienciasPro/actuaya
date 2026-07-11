import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'percentage',
  standalone: true,
})
export class PercentagePipe implements PipeTransform {
  transform(value: number | null | undefined, decimals: number = 0): string {
    if (value == null) return '0%';
    return `${value.toFixed(decimals)}%`;
  }
}
