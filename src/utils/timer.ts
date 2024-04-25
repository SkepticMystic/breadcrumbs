export class Timer {
	private start: number;

	constructor() {
		this.start = performance.now();
	}

	elapsed(): number {
		return performance.now() - this.start;
	}

	reset(): void {
		this.start = performance.now();
	}

	elapsedMessage(action: string, reset = false): string {
		const msg = `${action} took ${Math.round(this.elapsed() * 100) / 100}ms`;

		if (reset) this.reset();

		return msg;
	}
}
