import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigurationEvaluation } from './configuration-evaluation';

describe('ConfigurationEvaluation', () => {
  let component: ConfigurationEvaluation;
  let fixture: ComponentFixture<ConfigurationEvaluation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigurationEvaluation],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfigurationEvaluation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
