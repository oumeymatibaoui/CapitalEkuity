import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GrilleEvaluation } from './grille-evaluation';

describe('GrilleEvaluation', () => {
  let component: GrilleEvaluation;
  let fixture: ComponentFixture<GrilleEvaluation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GrilleEvaluation],
    }).compileComponents();

    fixture = TestBed.createComponent(GrilleEvaluation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
