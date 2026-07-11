import { Directive, ElementRef, HostListener, forwardRef, inject, OnInit } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

/**
 * Directive that formats numeric inputs with thousand separators (dots)
 * while maintaining a clean numeric value for the model.
 *
 * Usage: <input umCurrencyInput [(ngModel)]="amount" />
 *
 * Displays: 3.000.000
 * Model value: 3000000
 */
@Directive({
  selector: 'input[umCurrencyInput]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CurrencyInputDirective),
      multi: true,
    },
  ],
})
export class CurrencyInputDirective implements ControlValueAccessor, OnInit {
  private el = inject(ElementRef<HTMLInputElement>);

  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnInit(): void {
    // Override the input type to text so we can display formatted values
    this.el.nativeElement.type = 'text';
    this.el.nativeElement.inputMode = 'numeric';
  }

  /** Format number with dots as thousand separators */
  private formatNumber(value: number | null): string {
    if (value === null || value === undefined || isNaN(value)) return '';
    // Use dot as thousand separator (Colombian format)
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  /** Strip dots and parse the raw numeric value */
  private parseNumber(display: string): number | null {
    if (!display || display.trim() === '') return null;
    const clean = display.replace(/\./g, '');
    const num = parseInt(clean, 10);
    return isNaN(num) ? null : num;
  }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    // Remove any non-digit character
    const digitsOnly = value.replace(/[^\d]/g, '');
    const numericValue = digitsOnly ? parseInt(digitsOnly, 10) : null;

    // Format with dots
    const formatted = this.formatNumber(numericValue);

    // Update the display
    this.el.nativeElement.value = formatted;

    // Notify Angular of the numeric value
    this.onChange(numericValue);
  }

  @HostListener('blur')
  onBlur(): void {
    this.onTouched();
  }

  // ControlValueAccessor implementation
  writeValue(value: number | null): void {
    this.el.nativeElement.value = this.formatNumber(value);
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.el.nativeElement.disabled = isDisabled;
  }
}
