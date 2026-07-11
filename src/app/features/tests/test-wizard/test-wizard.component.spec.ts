import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestWizardComponent } from './test-wizard.component';

describe('TestWizardComponent', () => {
  let component: TestWizardComponent;
  let fixture: ComponentFixture<TestWizardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestWizardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TestWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
