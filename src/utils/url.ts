/** Build URLSearchParams from a key/value map. The values don't _have_ to be strings */
export const url_search_params = (
	obj: Record<string, unknown>,
	options?: { delimiter?: string },
) => {
	const { delimiter } = Object.assign({ delimiter: " " }, options);
	let params = "";

	for (const key in obj) {
		params += `${key}=${obj[key]}${delimiter}`;
	}

	// Remove trailing &
	params = params.slice(0, -1);

	return params;
};
