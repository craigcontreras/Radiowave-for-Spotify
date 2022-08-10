<script>
    export let images = [];
    export let name = "";
</script>

<div>
    <div class="hover:border-2 hover:border-black transition-all relative">
        <img class="border-base-100 z-[1] border-2 inline h-[80px] rounded-lg drop-shadow-xl" loading="lazy" src="{images[0] || ""}" alt="">
        <img class="border-base-100 z-[2] border-2 inline h-[80px] -ml-[3rem] rounded-lg drop-shadow-xl" loading="lazy" src="{images[1] || ""}" alt="">
        <img class="border-base-100 z-[3] border-2 inline h-[80px] -ml-[3rem] rounded-lg drop-shadow-xl" loading="lazy" src="{images[2] || ""}" alt="">
        <img class="border-base-100 z-[4] border-2 inline h-[80px] -ml-[3rem] rounded-lg drop-shadow-xl" loading="lazy" src="{images[3] || ""}" alt="">
        <img class="border-base-100 z-[5] border-2 inline h-[80px] -ml-[3rem] rounded-lg drop-shadow-xl" loading="lazy" src="{images[4] || ""}" alt="">
    </div>

    <a href="/" class="mt-2 font-bold text-lg">{name}</a>
</div>

<style>

</style>