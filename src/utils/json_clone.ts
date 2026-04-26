/** Deep-clone JSON-serializable values. Prefer over `structuredClone` for settings slices that may include Proxies. */
export function json_clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}
