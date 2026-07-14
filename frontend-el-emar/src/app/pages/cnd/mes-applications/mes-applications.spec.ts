import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MesApplications } from './mes-applications';

describe('MesApplications', () => {
  let component: MesApplications;
  let fixture: ComponentFixture<MesApplications>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MesApplications],
    }).compileComponents();

    fixture = TestBed.createComponent(MesApplications);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
