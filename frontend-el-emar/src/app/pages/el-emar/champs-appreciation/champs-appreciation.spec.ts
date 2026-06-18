import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChampsAppreciation } from './champs-appreciation';

describe('ChampsAppreciation', () => {
  let component: ChampsAppreciation;
  let fixture: ComponentFixture<ChampsAppreciation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChampsAppreciation],
    }).compileComponents();

    fixture = TestBed.createComponent(ChampsAppreciation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
