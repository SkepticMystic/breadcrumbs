/** Build URLSearchParams from a key/value map. The values don't _have_ to be strings */
export const url_search_params = (
	obj: Record<string, unknown>,
	options?: { delimiter?: string; trim_lone_param?: boolean },
) => {
	const { delimiter } = Object.assign({ delimiter: " " }, options);
	let params = "";

	for (const key in obj) {
		params += `${key}=${obj[key]}${delimiter}`;
	}

	// Remove trailing &
	params = params.slice(0, -1);

	// Remove key if it's the only one
	if (options?.trim_lone_param && Object.keys(obj).length === 1) {
		params = params.split("=", 2)[1];
	}

	return params;
};
