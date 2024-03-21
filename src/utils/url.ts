/** Build URLSearchParams from a key/value map. The values don't _have_ to be strings */
export const url_search_params = (obj: Record<string, unknown>) => {
	let params = "";

	for (const key in obj) {
		params += `${key}=${obj[key]}&`;
	}

	// Remove trailing &
	params = params.slice(0, -1);

	return params;
};
