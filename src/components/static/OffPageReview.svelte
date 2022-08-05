<script>
    import { doc, getDoc } from "firebase/firestore";
    import Icon from "svelte-awesome";
    import { faHeart } from '@fortawesome/free-solid-svg-icons/faHeart';
    import { db } from "../../firebase";

    export let reviewType = "";
    export let trackAuthor;
    export let trackName;
    export let trackImage;
    export let trackId;
    export let likeCount;
    export let reviewAuthor;
    export let reviewMessage;
</script>

<a href="/{reviewType.replaceAll("s", "")}/reviews/{trackId}/{reviewAuthor}" class="w-full min-h-full bg-stone-900 flex drop-shadow-xl rounded-lg hover:-translate-y-1 transition-all break-words">
    <div class="pl-4 pb-4 track-image basis-1/6 inline-flex justify-start items-start">
        <a href="/{reviewType.replaceAll("s", "")}/{trackId}">
            <img loading="lazy" class="mt-4 inline-block align-middle rounded-lg" src="{trackImage}" alt="{trackName} by {trackAuthor} album cover">
        </a>    
    </div>
    <div class="p-4 basis-5/6 content inline-block">
        <a href="/{reviewType.replaceAll("s", "")}/{trackId}">
            <p class="text-lg break-all font-bold">{trackName} <span class="text-sm font-normal">by {trackAuthor}</span></p>
        </a>
        <a href="/user/{reviewAuthor}" class="block user-image mt-1">
            {#await getDoc(doc(db, `users/${reviewAuthor}`))}
                <p class="text-sm break-all">{reviewAuthor}</p>
            {:then data}
                <img class="inline-block align-middle max-w-[5%] rounded-full drop-shadow-xl" src="{data.get("photoURL")}" alt="Profile picture of {data.get("displayName")}">
                <p class="inline-block break-all align-middle text-sm ml-1">{data.get("displayName")}</p>
            {:catch err}
                <p class="text-sm break-all">{reviewAuthor}</p>
            {/await}
        </a>
        <div>
            {#if reviewMessage.length > 150}
                <p class="text-sm mt-1 break-all">{reviewMessage.substring(0, 151)}... <span class="text-xs text-gray-200 italic">view more</span></p>
            {:else}
                <p class="text-sm mt-1 break-all">{reviewMessage}</p>
            {/if}
            <p class="mt-1 text-sm"><Icon class="mr-1" data={faHeart}/> {likeCount} {(likeCount === 1 ? "like" : "likes")}</p>
        </div>
    </div>
</a>

<style>
</style>