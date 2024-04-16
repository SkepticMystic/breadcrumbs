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

    elapsedMessage(str: string): string {
        return `${str} took ${Math.round(this.elapsed() * 100) / 100}ms`;
    }
}