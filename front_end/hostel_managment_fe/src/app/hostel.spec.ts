import { TestBed } from '@angular/core/testing';

import { Hostel } from './hostel';

describe('Hostel', () => {
  let service: Hostel;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Hostel);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
