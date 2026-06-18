import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Zones } from './zones';

describe('Zones', () => {
  let component: Zones;
  let fixture: ComponentFixture<Zones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Zones],
    }).compileComponents();

    fixture = TestBed.createComponent(Zones);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
