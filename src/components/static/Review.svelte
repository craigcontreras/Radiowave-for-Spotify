<script>
	import { goto } from '$app/navigation';
	import { browser } from '$app/env';
	import Likes from '../interactive/Likes.svelte';
	import Rating from './Rating.svelte';
    import { doc, getDoc } from "firebase/firestore";
    import { db } from "../../firebase.js";
    import { faComment } from '@fortawesome/free-solid-svg-icons/faComment';
    import Icon from 'svelte-awesome';

    export let reviewRating;
    export let reviewMessage;
    export let reviewAuthor;
    export let reviewDate;
    export let commentHref;
    export let likeDoc;
    export let trackId = "";
    export let trackReview = "";
    export let reviewType = "";
    export let showLikeText = true;
    export let showCommentText = true;
</script>

<!-- Add a max width to all of the text so it doesn't overflow or smush the image -->
<div class="hover:-translate-y-1 transition-all drop-shadow-lg mt-6 mb-6 p-4 rounded-lg bg-black">
    {#await getDoc(doc(db, `users/${reviewAuthor}`))}
        <a href="/user/{reviewAuthor}"><p class="break-all text-xl font-bold">{reviewAuthor}</p></a>
    {:then data}
        <a href="/user/{reviewAuthor}"> 
            <img loading="lazy" class="inline-block align-middle rounded-full h-10 w-10" src="{data.get("photoURL")}" alt="Profile picture of {data.get("displayName")}">
            <p class="break-all pl-2 inline-block text-xl font-bold">{data.get("displayName")}</p>
        </a>
    {:catch err}
        <a href="/user/{reviewAuthor}"><p class="break-all text-xl font-bold">{reviewAuthor}</p></a>
    {/await}
    <div class="py-1 origin-left scale-75 w-16">
        <Rating avgRating={reviewRating}/>
    </div>
    <p class="text-lg break-all">{reviewMessage}</p>
    <p class="text-sm break-all">Written on {new Date(reviewDate?.seconds * 1000)}</p>
    <div id="likes-comments-stats">
        {#if showLikeText}
            <div class="like-button inline-block align-middle mr-1">
                <Likes fromDoc={likeDoc} {reviewType} {trackId} {trackReview} {reviewAuthor}/>
            </div>
        {/if}
        {#if showCommentText}
            <div class="comment-button inline-block align-middle">
                <Icon class="mr-2 align-middle inline-block" data={faComment}/><button class="inline-block align-middle" on:click|preventDefault={() => {
                    if (browser) {
                        goto(commentHref);
                    }
                }}>Comment</button>
            </div>
        {/if}
    </div>
</div>

<style>

</style>