<script>
    export let src;
    export let alt;
    export let text;
    export let href;
</script>

<div class="inline-flex flex-col w-[150px] justify-center items-center hover:-translate-y-1 transition-all profile-thumbnail text-center">
    <a {href}>
        <img class="rounded-full drop-shadow-xl h-[150px] w-[150px] max-h-full max-w-full" {src} {alt}>
        <p class="mt-2 max-w-full break-words">{text}</p>
    </a>
</div>

<style>

</style>