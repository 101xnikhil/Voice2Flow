export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class FixedClock implements Clock {
  private _now: Date;

  constructor(now: Date | string | number) {
    this._now = new Date(now);
  }

  now(): Date {
    return new Date(this._now.getTime());
  }

  set(now: Date | string | number): void {
    this._now = new Date(now);
  }

  advance(ms: number): void {
    this._now = new Date(this._now.getTime() + ms);
  }
}

export const defaultClock: Clock = new SystemClock();
