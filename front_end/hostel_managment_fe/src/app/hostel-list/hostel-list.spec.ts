import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HostelList } from './hostel-list';

describe('HostelList', () => {
  let component: HostelList;
  let fixture: ComponentFixture<HostelList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostelList],
    }).compileComponents();

    fixture = TestBed.createComponent(HostelList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
