import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppelsACandidature } from './appels-a-candidature';

describe('AppelsACandidature', () => {
  let component: AppelsACandidature;
  let fixture: ComponentFixture<AppelsACandidature>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppelsACandidature],
    }).compileComponents();

    fixture = TestBed.createComponent(AppelsACandidature);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
