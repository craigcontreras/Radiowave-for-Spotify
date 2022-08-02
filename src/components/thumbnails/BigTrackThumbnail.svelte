<script>
    export let href;
    export let src;
    export let alt;
    export let title;
    export let artist;
    export let classes;
    export let date;

    let releaseDate = date;
</script>

<a {href} class="{classes} inline-flex break-words w-40 min-h-[15rem] flex-col gap-1 bg-stone-900 p-4 rounded-lg drop-shadow-xl hover:-translate-y-1 transition-all">
    <img width=300 height=300 class="rounded-lg drop-shadow-xl max-h-full max-w-full" {src} {alt}>
    {#if title.length > 20}
        <h2 class="text-lg font-black mt-1">{title.substring(0, 21)}...</h2>
    {:else}
        <h2 class="font-black mt-1">{title}</h2>
    {/if}
    <p class="text-md">{artist}</p>
    {#if typeof(releaseDate) === "string"}
        <p class="text-xs">{releaseDate}</p>
    {:else}
        <p class="text-xs">{releaseDate?.toDate().getUTCFullYear()}-{releaseDate?.toDate().getUTCMonth() + 1}-{releaseDate?.toDate().getUTCDate()}</p>
    {/if}
</a>

<style>
</style>