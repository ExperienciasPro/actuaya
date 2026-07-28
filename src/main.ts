import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';

// Polyfill for crypto.randomUUID (Fixes white screen on Safari <= 15.3)
if (typeof window !== 'undefined' && window.crypto && !window.crypto.randomUUID) {
  window.crypto.randomUUID = function randomUUID() {
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c: any) =>
      (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
    ) as `${string}-${string}-${string}-${string}-${string}`;
  };
}

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
