<script>
	import Likes from './Likes.svelte';
	import Rating from './Rating.svelte';
    import { doc, getDoc } from "firebase/firestore";
    import { db } from "../firebase.js";

    export let trackId;
    export let reviewRating;
    export let reviewMessage;
    export let reviewAuthor;
    export let reviewDate;
</script>

<!-- Add a max width to all of the text so it doesn't overflow or smush the image -->
<div class="hover:-translate-y-1 transition-all drop-shadow-lg mt-6 mb-6 p-4 rounded-lg bg-gray-800">
    {#await getDoc(doc(db, `users/${reviewAuthor}`))}
        <p class="text-xl font-bold">{reviewAuthor}</p>
    {:then data}
        <img class="inline-block align-middle rounded-full h-10 w-10" src="{data.get("photoURL")}" alt="Profile picture of {data.get("displayName")}">
        <p class="pl-2 inline-block text-xl font-bold">{data.get("displayName")}</p>
    {:catch err}
        <p class="text-xl font-bold">{reviewAuthor}</p>
    {/await}
    <div class="py-1 origin-left scale-75 w-16">
        <Rating avgRating={reviewRating}/>
    </div>
    <p class="text-lg">{reviewMessage}</p>
    <p class="text-sm">Written on {reviewDate}</p>
    <div id="likes-comments-stats">
        <Likes fromDoc="tracks/{trackId}/reviews/{reviewAuthor}"/>
    </div>
</div>
<div class="divider"></div>

<style>

</style>