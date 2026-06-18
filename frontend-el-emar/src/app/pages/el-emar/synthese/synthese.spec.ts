import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Synthese } from './synthese';

describe('Synthese', () => {
  let component: Synthese;
  let fixture: ComponentFixture<Synthese>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Synthese],
    }).compileComponents();

    fixture = TestBed.createComponent(Synthese);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
