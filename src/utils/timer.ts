export class Timer {
	private start: number;

	constructor() {
		this.start = performance.now();
	}

	elapsed(): number {
		return performance.now() - this.start;
	}

	elapsed_str(digits = 0): string {
		return this.elapsed().toFixed(digits);
	}

	reset(): void {
		this.start = performance.now();
	}

	elapsedMessage(action: string, reset = false): string {
		const msg = `${action} took ${this.elapsed_str(2)}ms`;

		if (reset) this.reset();

		return msg;
	}
}
