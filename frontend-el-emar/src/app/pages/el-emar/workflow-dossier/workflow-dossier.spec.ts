import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkflowDossier } from './workflow-dossier';

describe('WorkflowDossier', () => {
  let component: WorkflowDossier;
  let fixture: ComponentFixture<WorkflowDossier>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkflowDossier],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkflowDossier);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
