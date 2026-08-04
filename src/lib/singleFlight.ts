export class SingleFlight {
  private active = false;

  get running(): boolean {
    return this.active;
  }

  async run<T>(task: () => Promise<T>): Promise<{ started: boolean; value?: T }> {
    if (this.active) return { started: false };
    this.active = true;
    try {
      return { started: true, value: await task() };
    } finally {
      this.active = false;
    }
  }
}
