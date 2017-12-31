export class Report {
  public inserted: number;
  public duration: number; // millisecond

  constructor(inserted: number = 0, duration: number = 0) {
    this.inserted = inserted;
    this.duration = duration;
  }

  public Add(report?: Report): Report {
    if (report == undefined)
      return this;

    this.inserted += report.inserted;
    this.duration += report.duration;

    return this;
  }
}
