import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentsDemandes } from './documents-demandes';

describe('DocumentsDemandes', () => {
  let component: DocumentsDemandes;
  let fixture: ComponentFixture<DocumentsDemandes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentsDemandes],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentsDemandes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
