/** Build URLSearchParams from a key/value map. The values don't _have_ to be strings */
export const url_search_params = (obj: Record<string, unknown>) => {
	const params = new URLSearchParams();

	for (const key in obj) {
		params.append(key, String(obj[key]));
	}

	return params;
};
