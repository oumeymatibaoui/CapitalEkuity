import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdministrationDashboard } from './administration-dashboard';

describe('AdministrationDashboard', () => {
  let component: AdministrationDashboard;
  let fixture: ComponentFixture<AdministrationDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdministrationDashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(AdministrationDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
