import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElEmarLayout } from './el-emar-layout';

describe('ElEmarLayout', () => {
  let component: ElEmarLayout;
  let fixture: ComponentFixture<ElEmarLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ElEmarLayout],
    }).compileComponents();

    fixture = TestBed.createComponent(ElEmarLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
