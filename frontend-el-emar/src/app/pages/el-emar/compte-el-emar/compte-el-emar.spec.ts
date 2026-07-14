import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompteElEmar } from './compte-el-emar';

describe('CompteElEmar', () => {
  let component: CompteElEmar;
  let fixture: ComponentFixture<CompteElEmar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompteElEmar],
    }).compileComponents();

    fixture = TestBed.createComponent(CompteElEmar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
