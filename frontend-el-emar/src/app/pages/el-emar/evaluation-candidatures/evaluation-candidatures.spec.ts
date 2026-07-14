import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluationCandidatures } from './evaluation-candidatures';

describe('EvaluationCandidatures', () => {
  let component: EvaluationCandidatures;
  let fixture: ComponentFixture<EvaluationCandidatures>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvaluationCandidatures],
    }).compileComponents();

    fixture = TestBed.createComponent(EvaluationCandidatures);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
