import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationsCnd } from './notifications-cnd';

describe('NotificationsCnd', () => {
  let component: NotificationsCnd;
  let fixture: ComponentFixture<NotificationsCnd>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationsCnd],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsCnd);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
