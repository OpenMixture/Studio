/** Product-owned freshness: one active job and one replaceable pending job. */
export class LatestRenderer<Input, Output> {
  private generation = 0;
  private pending: { generation: number; input: Input } | undefined;
  private active: Promise<void> | undefined;
  private closed = false;
  private work: (input: Input) => Promise<Output>;
  private callbacks: {
    result(output: Output, input: Input): void;
    error(error: unknown): void;
    state(): void;
  };

  constructor(work: (input: Input) => Promise<Output>, callbacks: LatestRenderer<Input, Output>['callbacks']) {
    this.work = work;
    this.callbacks = callbacks;
  }

  get busy(): boolean { return this.active !== undefined; }
  get queued(): boolean { return this.pending !== undefined; }

  invalidate(): void {
    this.generation++;
    this.pending = undefined;
    this.callbacks.state();
  }

  submit(input: Input): void {
    if (this.closed) return;
    this.pending = { generation: ++this.generation, input };
    this.pump();
    this.callbacks.state();
  }

  close(): Promise<void> {
    this.closed = true;
    this.invalidate();
    return this.active ?? Promise.resolve();
  }

  private pump(): void {
    if (this.active || this.closed || !this.pending) return;
    const job = this.pending;
    this.pending = undefined;
    // Publish active ownership before calling work, including synchronous failures.
    this.active = Promise.resolve().then(async () => {
      if (this.closed || job.generation !== this.generation) return;
      try {
        const output = await this.work(job.input);
        if (!this.closed && job.generation === this.generation) this.callbacks.result(output, job.input);
      } catch (error) {
        if (!this.closed && job.generation === this.generation) this.callbacks.error(error);
      }
    }).finally(() => {
      this.active = undefined;
      this.pump();
      this.callbacks.state();
    });
  }
}
