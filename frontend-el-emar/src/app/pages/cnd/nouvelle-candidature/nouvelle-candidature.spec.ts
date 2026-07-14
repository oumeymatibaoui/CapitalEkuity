import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NouvelleCandidature } from './nouvelle-candidature';

describe('NouvelleCandidature', () => {
  let component: NouvelleCandidature;
  let fixture: ComponentFixture<NouvelleCandidature>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NouvelleCandidature],
    }).compileComponents();

    fixture = TestBed.createComponent(NouvelleCandidature);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
