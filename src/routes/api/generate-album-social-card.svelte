<script context="module">
    export function load({ url }) {
        const name = url.searchParams.get("name") || "N/A";
        const artist = url.searchParams.get("artist") || "N/A";
        const image = url.searchParams.get("image") || "N/A";
        const album = url.searchParams.get("album") || "N/A";
        const rating = url.searchParams.get("rating") || "N/A";
        const numRatings = url.searchParams.get("numRatings") || "N/A";
        return {
            props: {
                name,
                image,
                artist,
                album,
                rating,
                numRatings
            }
        }
    }
</script>

<script>
    import { browser } from "$app/env";
    import { goto } from "$app/navigation";
    import { session } from "$app/stores";
    import { get } from "svelte/store";
    import Rating from "../../components/Rating.svelte";
    
    export let name;
    export let image;
    export let artist;
    export let album;
    export let rating;
    export let numRatings;

    const {userAgent} = get(session);

    if (userAgent !== "puppeteer") {
        if (browser) {
            goto("/error");
        }
    }
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Gideon+Roman&family=Roboto:wght@400;900&display=swap" rel="stylesheet">
</svelte:head>

<div class="bg-base-100 h-[412px] w-[730px] relative">
    <div class="gradient inset-0 opacity-50 bg-gradient-to-b from-transparent via-transparent to-black absolute"></div>
    <div class="track-details">
        <img class="rounded-lg h-[150px] w-[150px] drop-shadow-xl m-6 inline-block" src={image} alt="">
        <div class="inline-flex align-middle flex-col justify-start max-w-[95%]">
            {#if name.length > 11}
                <h1 class="font-black text-6xl break-words block">{name.substring(0, 12)}...</h1>
            {:else}
                <h1 class="font-black text-6xl break-words block">{name}</h1>
            {/if}
            <h2 class="font-black text-4xl break-words block">by {artist}</h2>
            {#if album !== "N/A"}
                <h2 class="font-black text-2xl break-words block">on {album}</h2>
            {/if}
        </div>
    </div>

    <div class="content">
        <div class="rating-item ml-6">
            <div class="w-16 drop-shadow-xl mb-2">
                <Rating avgRating={parseInt(rating)}/>
            </div>
            {#if numRatings === 1}
                <p>based on {numRatings} rating</p>
            {:else}
                <p>based on {numRatings} ratings</p>
            {/if}
        </div>
    </div>
    <div class="absolute opacity-50 py-4 px-6 bg-stone-800 rounded-lg drop-shadow-xl bottom-0 m-6">
        <p>radiowave.app</p>
    </div>
</div>

<style>
    h1, h2, p {
        font-family: Roboto;
    }
</style>