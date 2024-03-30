<script lang="ts">
	import { active_file_store } from "src/stores/active_file";
	import { Paths } from "src/utils/paths";

	export let path: string;
	export let display: string;
	export let resolved: boolean;
	export let cls: string = "";

	const no_ext = Paths.drop_ext(path);
</script>

<a
	data-href={no_ext}
	href={no_ext}
	class="internal-link {cls}"
	class:is-unresolved={!resolved}
	class:BC-active-note={$active_file_store?.path === path}
	target="_blank"
	rel="noopener"
	aria-label={// Previously checked if path === display
	// But I think we should only show the label if the folder/basename is different,
	// not just the extension
	no_ext === display ? "" : path}
>
	{display}
</a>
