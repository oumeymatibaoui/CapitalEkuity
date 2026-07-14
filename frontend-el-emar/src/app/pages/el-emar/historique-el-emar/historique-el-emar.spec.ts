import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoriqueElEmar } from './historique-el-emar';

describe('HistoriqueElEmar', () => {
  let component: HistoriqueElEmar;
  let fixture: ComponentFixture<HistoriqueElEmar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoriqueElEmar],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoriqueElEmar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
