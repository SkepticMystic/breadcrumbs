<!-- Source: https://github.com/HEmile/juggl/blob/main/juggl/ui/KoFi.svelte -->
<script>
  let button;
  const initializeKofi = () => {
    kofiwidget2.init(
      "Support Breadcrumbs development!",
      "#29abe0",
      "G2G454TZF"
    );
    button.innerHTML = kofiwidget2.getHTML();
  };
</script>

<svelte:head>
  <script
    type="text/javascript"
    src="https://ko-fi.com/widgets/widget_2.js"
    on:load={initializeKofi}>
  </script>
</svelte:head>
<div bind:this={button} />
