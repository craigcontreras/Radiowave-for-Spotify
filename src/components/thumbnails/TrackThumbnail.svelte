<script>
    export let href;
    export let src;
    export let alt;
    export let title;
    export let artist;
    export let classes;
</script>

<a {href} class="{classes} inline-flex break-words w-40 min-h-[13rem] flex-col gap-1 bg-stone-900 p-4 rounded-lg drop-shadow-xl hover:-translate-y-1 transition-all">
    <img width=150 height=150 class="rounded-lg drop-shadow-xl max-h-full max-w-full" {src} {alt}>
    {#if title.length > 11}
        <h2 class="font-black mt-1">{title.substring(0, 12)}...</h2>
    {:else}
        <h2 class="font-black mt-1">{title}</h2>
    {/if}
    <p class="text-xs">{artist}</p>
</a>

<style>
</style>