export function deep_merge_objects<T>(obj1: T, obj2: T): T {
	const result = { ...obj1 } as T;

	for (const key in obj2) {
		const val1 = obj1[key];
		const val2 = obj2[key];

		if (
			typeof val1 === "object" &&
			!Array.isArray(val1) &&
			typeof val2 === "object" &&
			!Array.isArray(val2)
		) {
			result[key] = deep_merge_objects(val1, val2);
		} else if (val1 === undefined) {
			result[key] = val2;
		}
		// TODO: Somewhere here, I can handle the array case
	}

	return result;
}
