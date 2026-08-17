import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkflowConfiguration } from './workflow-configuration';

describe('WorkflowConfiguration', () => {
  let component: WorkflowConfiguration;
  let fixture: ComponentFixture<WorkflowConfiguration>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkflowConfiguration],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkflowConfiguration);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
