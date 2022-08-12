<script>
    export let images = [];
    export let name = "";
    export let href = "";
</script>

<div>
    <a {href}>
        <div class="mb-1 min-w-[80px] min-h-[80px] rounded-lg outline hover:outline-8 max-w-max outline-base-300 transition-all">
            <img height=80 width=80 class="{images[0] ? "" : "hidden"} border-base-100 z-[1] border-2 inline h-[80px] rounded-lg drop-shadow-xl" loading="lazy" src="{images[0] || ""}" alt="">
            <img height=80 width=80 class="{images[1] ? "" : "hidden"} border-base-100 z-[2] border-2 inline h-[80px] -ml-[3rem] rounded-lg drop-shadow-xl" loading="lazy" src="{images[1] || ""}" alt="">
            <img height=80 width=80 class="{images[2] ? "" : "hidden"} border-base-100 z-[3] border-2 inline h-[80px] -ml-[3rem] rounded-lg drop-shadow-xl" loading="lazy" src="{images[2] || ""}" alt="">
            <img height=80 width=80 class="{images[3] ? "" : "hidden"} border-base-100 z-[4] border-2 inline h-[80px] -ml-[3rem] rounded-lg drop-shadow-xl" loading="lazy" src="{images[3] || ""}" alt="">
            <img height=80 width=80 class="{images[4] ? "" : "hidden"} border-base-100 z-[5] border-2 inline h-[80px] -ml-[3rem] rounded-lg drop-shadow-xl" loading="lazy" src="{images[4] || ""}" alt="">
        </div>
    </a>
    <a {href} class="hover:-translate-y-1 transition-all font-bold text-lg">{name}</a>
</div>

<style>

</style>