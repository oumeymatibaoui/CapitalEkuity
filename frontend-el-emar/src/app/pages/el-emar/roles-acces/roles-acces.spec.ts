import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RolesAcces } from './roles-acces';

describe('RolesAcces', () => {
  let component: RolesAcces;
  let fixture: ComponentFixture<RolesAcces>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolesAcces],
    }).compileComponents();

    fixture = TestBed.createComponent(RolesAcces);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
