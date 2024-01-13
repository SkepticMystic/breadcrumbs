export const swap_items = <T>(i: number, j: number, arr: T[]) => {
	const max = arr.length - 1;
	if (i < 0 || i > max || j < 0 || j > max) return arr;

	const tmp = arr[i];
	arr[i] = arr[j];
	arr[j] = tmp;

	return arr;
};
