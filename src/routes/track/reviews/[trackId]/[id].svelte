<script context="module">
	import SEO from './../../../../components/utilities/SEO.svelte';
    import { db, auth } from "../../../../firebase.js";
    import { v4 as uuidv4 } from "uuid";
    import { doc, getDoc } from 'firebase/firestore';

    let reviewExists;
    let reviewLikes;
    let reviewDetails;
    let trackDetails;
    let authorDisplayName;

    export async function load({params}) {
        await loginToFirebase(params);
        await getReview(params);
        await getTrack(params);
        return {
            props: {
                reviewExists,
                reviewLikes,
                reviewDetails,
                trackDetails,
                authorDisplayName
            }
        }
    }

    function getCurrentUser() {
        return new Promise((resolve, reject) => {
            if (userLoaded) {
                resolve(auth.currentUser);
            }
            const unsubscribe = auth.onAuthStateChanged(user => {
                userLoaded = true;
                unsubscribe();
                resolve(user);
            }, reject);
        })
    }

    async function loginToFirebase(params) {
        const reviewDoc = await getDoc(doc(db, `tracks/${params.trackId}/reviews/${params.id}`));
        if (reviewDoc.exists()) {
            reviewExists = true;
            reviewLikes = reviewDoc.data().likes;
            return "Completed";
        } else {
            throw new Error("Review does not exist");
        }
    }

    async function getReview(params) {
        const reviewDetailsData = await getDoc(doc(db, `tracks/${params.trackId}/reviews/${params.id}`));
        reviewDetails = reviewDetailsData.data();
        const user = await getDoc(doc(db, `users/${reviewDetails?.author}`));
        authorDisplayName = user.data().displayName;
        return "Completed";
    }

    async function getTrack(params) {
        const trackDetailsData = await getDoc(doc(db, `tracks/${params.trackId}`));
        trackDetails = trackDetailsData.data();
        return "Completed";
    }
</script>

<script>
	import UserThumbnail from './../../../../components/thumbnails/UserThumbnail.svelte';
	import Review from './../../../../components/static/Review.svelte';
	import Comments from './../../../../components/interactive/Comments.svelte';
	import { page } from '$app/stores';

    export let reviewExists = false;
    export let reviewDetails = {};
    export let trackDetails = {};
    export let reviewLikes = [];
    export let authorDisplayName;
</script>

<SEO title="{authorDisplayName}'s review of {trackDetails?.album?.artists[0]?.name} - {trackDetails?.name} - Radiowave for Spotify" description="{reviewDetails?.message}" image={trackDetails?.album?.images[1]?.url} width=460 height=460/>

<div class="mx-6">
    <div class="my-2 text-sm breadcrumbs">
        <ul>
            <li><a href="/track/top/{new Date().getFullYear()}">Tracks</a></li>
            <li><a href="/track/{$page.params.trackId}">{trackDetails?.name}</a></li>
            <li>Reviews</li>
            <li>{$page.params.id}</li>
        </ul>
    </div>
    <a href="/track/{$page.params.trackId}">
        <img class="transition-all hover:-translate-y-1 inline-block align-middle rounded-lg outline-4 drop-shadow-xl" src={trackDetails?.album?.images[2]?.url} alt="Album cover">
    </a>
    <div id="track-details" class="transition-all hover:-translate-y-1 mx-1 leading-4 align-middle inline-block">
        <a href="/track/{$page.params.trackId}">
            <h1 class="text-lg font-black">{trackDetails?.name}</h1> 
            <h2 class="text-md font-bold">by {trackDetails?.album?.artists[0]?.name}</h2>
            <h3 class="text-sm font-medium">on {trackDetails?.album?.name}</h3>    
        </a>
    </div>
    <Review showLikeText={false} showCommentText={false} trackId={$page.params.trackId} reviewRating={reviewDetails?.rating} reviewAuthor={reviewDetails?.author} reviewMessage={reviewDetails?.message} reviewDate={reviewDetails?.date}/>
    <h2 class="text-lg font-bold">Likes ({reviewDetails?.likeCount})</h2>
    <div id="likes" class="grid mt-2 grid-flow-row-dense grid-cols-12 gap-1">
        {#each reviewLikes as like}
            {#await getDoc(doc(db, `users/${like}`))}
                <UserThumbnail imgSrc="" username={like}/>
            {:then data}
                <UserThumbnail imgSrc={data.get("photoURL")} username={like}/>
            {:catch err}
                <UserThumbnail imgSrc="" username={like}/>
            {/await}
        {/each}
    </div>
    <div class="divider"></div>
</div>

{#if reviewExists}
    <div class="mx-6">
        <Comments fromCollection={`tracks/${$page.params.trackId}/reviews/${$page.params.id}/comments`} fromDoc={`tracks/${$page.params.trackId}/reviews/${$page.params.id}/comments/${uuidv4()}`}/>
    </div>
{/if}

<style>

</style>