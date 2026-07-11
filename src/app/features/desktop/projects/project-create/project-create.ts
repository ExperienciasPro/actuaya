import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'um-project-create',
  standalone: true,
  template: '',
})
export class ProjectCreateComponent {
  private router = inject(Router);

  constructor() {
    // Creation is now handled via modal in the board view
    this.router.navigate(['/d/projects']);
  }
}
