import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TypesIntervenant } from './types-intervenant';

describe('TypesIntervenant', () => {
  let component: TypesIntervenant;
  let fixture: ComponentFixture<TypesIntervenant>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TypesIntervenant],
    }).compileComponents();

    fixture = TestBed.createComponent(TypesIntervenant);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
