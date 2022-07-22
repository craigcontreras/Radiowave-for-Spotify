<script>
    import Review from './Review.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/env';
    import { collection, serverTimestamp, doc, orderBy, query, writeBatch, getDocs, limit, startAfter } from "firebase/firestore";
    import { onMount } from "svelte";
    import remove from "lodash/remove.js";
    import { auth, db } from "../firebase.js";

    export let trackId;
    export let userId;
    
    let lastVisible;
    let currentTrackSize;
    let currUserHasReview = false;
    let currUserReview = "";
    let currUserRating = 0;
    let userLoaded = false;

    const allTrackReviews = [];

    onMount(() => {
        loginToFirebase();
    });

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
    
    function addToReviews(data) {
        allTrackReviews.push(data);
        allTrackReviews = allTrackReviews;
    }
    
    async function paginateData() {
        if (lastVisible || currentTrackSize < 5) {    
            const allTracksRef = collection(db, `tracks/${trackId}/reviews`);
            const allTracksQuery = query(allTracksRef, orderBy("likeCount", "desc"), startAfter(lastVisible), limit(5));
            const allTracks = await getDocs(allTracksQuery);

            lastVisible = allTracks.docs[allTracks.docs.length - 1];
            currentTrackSize = allTracks.docs.length;

            allTracks.forEach(doc => {
                addToReviews(doc.data());

                if (doc.id === user.uid) {
                    currUserHasReview = true;
                    currUserReview = doc.data().message;
                    currUserRating = doc.data().rating;
                }
            });
        }
    }

    async function loginToFirebase() {
        const user = await getCurrentUser();
        if (user !== null) {
            const allTracksRef = collection(db, `tracks/${trackId}/reviews`);
            const allTracksQuery = query(allTracksRef, orderBy("likeCount", "desc"), limit(5));
            const allTracks = await getDocs(allTracksQuery);

            lastVisible = allTracks.docs[allTracks.docs.length - 1];
            currentTrackSize = allTracks.docs.length;

            allTracks.forEach(doc => {
                addToReviews(doc.data());

                if (doc.id === user.uid) {
                    currUserHasReview = true;
                    currUserReview = doc.data().message;
                    currUserRating = doc.data().rating;
                }
            });
        } else {
            if (browser) {
                goto("/error");
            }
        }
    }

    async function deleteCurrUserReview() {
        const user = await getCurrentUser();
        if (user !== null && currUserHasReview) {
            const batch = writeBatch(db);
            batch.delete(doc(db, `tracks/${$page.params.id}/reviews/${userId}`));
            batch.delete(doc(db, `users/${userId}/reviews/${$page.params.id}`));
            await batch.commit();

            currUserHasReview = false;
            currUserReview = "";
            currUserRating = 0;
            
            remove(allTrackReviews, (e) => {
                return e.author === user.uid;
            });
            allTrackReviews = allTrackReviews;

            if (browser) {
                location.reload();
            }
        } else {
            if (browser) {
                goto("/error");
            }
        }
    }

    async function submitCurrUserReview(message, rating) {
        const user = await getCurrentUser();
        if (user !== null) {
            const batch = writeBatch(db);
            batch.set(doc(db, `tracks/${$page.params.id}/reviews/${userId}`), {
                author: userId,
                date: serverTimestamp(),
                rating,
                message,
                likes: [],
                likeCount: 0,
            });
            batch.set(doc(db, `users/${userId}/reviews/${$page.params.id}`), {
                author: userId,
                date: serverTimestamp(),
                rating,
                message,
                likes: [],
                likeCount: 0,
            });
            await batch.commit();
            if (browser) {
                location.reload();
            }
        } else {
            if (browser) {
                goto("/error");
            }
        }
    }
</script>

<div class="my-4" id="current-user-review">
    {#if currUserHasReview}
        <h2>Your review</h2>
    {/if}

    <form action="" on:submit|preventDefault>
        <div class="py-2">
            <input class="hover:-translate-y-1 focus:drop-shadow-xl transition-all input input-bordered w-28" bind:value={currUserRating} type="number" min="0" max="100">
        </div>
        <div class="w-10/12 pb-2">
            <textarea class="hover:-translate-y-1 focus:drop-shadow-xl transition-all textarea textarea-bordered w-full" required bind:value={currUserReview} cols="20" rows="10"></textarea>
        </div>
        <button class="hover:-translate-y-1 transition-all font-bold btn btn-info btn-sm" on:click|preventDefault={() => {
            submitCurrUserReview(currUserReview, currUserRating);
        }}>Submit</button>

        {#if currUserHasReview}
            <button class="hover:-translate-y-1 transition-all font-bold btn btn-error btn-sm" on:click|preventDefault={evt => {
                deleteCurrUserReview();
            }}>Delete</button>
        {/if}
    </form>
</div>

<!-- Display every review -->

{#if allTrackReviews.length === 0}
    <p>No reviews found.</p>
{/if}

<div id="reviews">
    {#each allTrackReviews as review}
        <Review commentHref="/track/reviews/{trackId}/{review.author}" {trackId} reviewRating={review.rating} reviewMessage={review.message} reviewAuthor={review.author} reviewDate={review.date} />
    {/each}
    
    {#if currentTrackSize >= 5}
        <button class="text-center py-4 px-8 bg-slate-700 hover:-translate-y-1 drop-shadow-lg rounded-lg transition-all" on:click={paginateData}>Load more reviews</button>
    {/if}
</div>

<style>

</style>