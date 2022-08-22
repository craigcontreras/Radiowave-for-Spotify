<script>
    import Review from '../static/Review.svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/env';
    import { collection, serverTimestamp, doc, orderBy, query, writeBatch, getDocs, limit, startAfter } from "firebase/firestore";
    import { onMount } from "svelte";
    import remove from "lodash/remove.js";
    import { auth, db } from "../../firebase.js";
    import { get } from 'svelte/store';
    import { session } from '$app/stores';

    export let trackId;
    export let trackName;
    export let trackAuthor;
    export let trackHref;
    export let userId;
    export let commentHref;
    export let likeDoc;
    export let fromDoc;
    export let fromCollection;
    export let reviewType;
    
    let lastVisible;
    let currentTrackSize;
    let currUserHasReview = false;
    let currUserReview = "";
    let currUserRating = 0;
    let userLoaded = false;
    let invalidUser = true;

    const allTrackReviews = [];
    const {userAgent} = get(session);

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
            const allTracksRef = collection(db, fromCollection);
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
        const allTracksRef = collection(db, fromCollection);
        const allTracksQuery = query(allTracksRef, orderBy("likeCount", "desc"), limit(5));
        const allTracks = await getDocs(allTracksQuery);

        lastVisible = allTracks.docs[allTracks.docs.length - 1];
        currentTrackSize = allTracks.docs.length;

        allTracks.forEach(doc => {
            addToReviews(doc.data());
        });

        const user = await getCurrentUser();

        if (user !== null) {
            invalidUser = false;

            allTracks.forEach(doc => {
                if (doc.id === user.uid) {
                    currUserHasReview = true;
                    currUserReview = doc.data().message;
                    currUserRating = doc.data().rating;
                }
            });
        }
    }

    async function deleteCurrUserReview() {
        const user = await getCurrentUser();
        if (user !== null && currUserHasReview) {
            const batch = writeBatch(db);
            batch.delete(doc(db, fromDoc));
            batch.delete(doc(db, `users/${userId}/reviews/${trackId}`));
            batch.delete(doc(db, `review-statistics/${trackId}-${userId}`));
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
            throw new Error("User is not logged in")
        }
    }

    async function submitCurrUserReview(message, rating) {
        const user = await getCurrentUser();
        if (user !== null) {
            const batch = writeBatch(db);
            batch.set(doc(db, fromDoc), {
                author: userId,
                date: serverTimestamp(),
                rating,
                message,
                likes: [],
                likeCount: 0,
                trackId,
                trackName,
                trackAuthor,
                trackHref,
                type: reviewType
            });
            batch.set(doc(db, `users/${userId}/reviews/${trackId}`), {
                author: userId,
                date: serverTimestamp(),
                rating,
                message,
                likes: [],
                likeCount: 0,
                trackId,
                trackName,
                trackAuthor,
                trackHref,
                type: reviewType
            });
            batch.set(doc(db, `review-statistics/${trackId}-${userId}`), {
                author: userId,
                stats: {},
                track: trackId,
                type: reviewType
            })
            await batch.commit();
            if (browser) {
                location.reload();
            }
        } else {
            throw new Error("User is not logged in");
        }
    }
</script>

{#if !invalidUser}
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
{:else}
    <p>Please log in to review.</p>
{/if}

<!-- Display every review -->

{#if allTrackReviews.length === 0}
    <p>No reviews found.</p>
{/if}

<div id="reviews">
    {#each allTrackReviews as review}
        <Review {reviewType} trackReview={true} commentHref={commentHref + `${review.author}`} likeDoc={likeDoc + `${review.author}`} reviewRating={review.rating} reviewMessage={review.message} reviewAuthor={review.author} {trackId} reviewDate={review.date} />
    {/each}
    
    {#if currentTrackSize >= 5}
        <button class="text-center py-4 px-8 bg-stone-800 hover:-translate-y-1 drop-shadow-lg rounded-lg transition-all" on:click={paginateData}>Load more reviews</button>
    {/if}
</div>

<style>

</style>