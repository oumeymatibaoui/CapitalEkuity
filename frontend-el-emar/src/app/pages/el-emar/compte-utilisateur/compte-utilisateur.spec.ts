import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompteUtilisateur } from './compte-utilisateur';

describe('CompteUtilisateur', () => {
  let component: CompteUtilisateur;
  let fixture: ComponentFixture<CompteUtilisateur>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompteUtilisateur],
    }).compileComponents();

    fixture = TestBed.createComponent(CompteUtilisateur);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
