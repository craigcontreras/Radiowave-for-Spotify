<script>
    export let image;
    export let title;
    export let description;
    export let width = 730;
    export let height = 412;
    export let robots = "index, follow, max-snippet:1, max-image-preview:large, max-video-preview:-1";
</script>

<svelte:head>
    <title>{title}</title>
    <meta property="og:locale" content="en_US">
    <meta property="og:site_name" content="Radiowave for Spotify">
    <meta name="robots" content={robots}>
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content={image}>
    <meta name="twitter:title" content={title}>
    <meta name="twitter:text:title" content={title}>
    <meta property="og:title" content={title}>
    <meta property="og:type" content="article">
    <meta property="og:description" content={description}>
    <meta property="description" content={description}>
    <meta property="og:image" content={image}>
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="{width}">
    <meta property="og:image:height" content="{height}">
</svelte:head>