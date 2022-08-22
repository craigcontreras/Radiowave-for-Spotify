<script context="module">
	import SEO from './../../../components/utilities/SEO.svelte';
    import { collection, doc, getDoc, getDocs, limit, orderBy, query, startAfter } from 'firebase/firestore';
    import { db } from '../../../firebase.js';

    let userData = {};

    export async function load({params}) {
        await loginToFirebase(params);
        return {
            props: {
                userData,
            }
        }
    }

    async function loginToFirebase(params) {
        const userDataDocument = await getDoc(doc(db, `users/${params.id}`));
        if (userDataDocument.exists()) {
            userData = userDataDocument.data();
        } else {
            throw new Error("User does not exist");
        }
        return "Completed";
    }
</script>

<script>
	import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import Review from '../../../components/static/Review.svelte';

    export let userData = {};
    let reviews = [];

    let lastVisible;
    let currentReviewSize;

    onMount(() => {
        loginToFirebaseClientside();
        window.onscroll = function (event) {
            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight && currentReviewSize >= 6) {
                paginateData();
            }
        }
    });

    async function paginateData() {
        if (lastVisible || currentReviewSize < 6) {
            const allReviewsRef = collection(db, `users/${$page.params.id}/reviews`);
            const allReviewsQuery = query(allReviewsRef, orderBy("date", "desc"), startAfter(lastVisible), limit(10));
            const allReviews = await getDocs(allReviewsQuery);

            lastVisible = allReviews.docs[allReviews.docs.length - 1];
            currentReviewSize = allReviews.docs.length;

            allReviews.forEach((doc) => {
                addToReviews(doc.data());
            });
        }
    }

    function addToReviews(data) {
        reviews.push(data);
        reviews = reviews;
    }

    async function loginToFirebaseClientside() {
        const allReviewsRef = collection(db, `users/${$page.params.id}/reviews`);
        const allReviewsQuery = query(allReviewsRef, orderBy("date", "desc"), limit(10));
        const allReviews = await getDocs(allReviewsQuery);

        lastVisible = allReviews.docs[allReviews.docs.length - 1];
        currentReviewSize = allReviews.docs.length;

        allReviews.forEach((doc) => {
            addToReviews(doc.data());
        });
    }
</script>

<SEO height=460 width=460 title="{userData?.displayName} - Reviews - Users - Radiowave for Spotify" description="View all tracks, albums reviewed by {userData?.displayName}, alongside their Spotify stats like recently played, top artists & tracks, and their latest likes on Radiowave for Spotify." image="{userData?.photoURL}"/>

<div class="page mx-6">
    <div class="my-2 text-sm breadcrumbs">
        <ul>
            <li><a href="/user/all">Users</a></li>
            <li><a href="/user/{$page.params.id}">{userData?.displayName}</a></li>
            <li>All recent reviews</li>
        </ul>
    </div>
    <a href="/user/{$page.params.id}">
        <img class="h-[48px] w-[48px] max-h-full max-w-full transition-all hover:-translate-y-1 inline-block align-middle rounded-full outline-4 drop-shadow-xl" src={userData?.photoURL} alt="Profile picture of {userData?.displayName}">
    </a>
    <div id="account-details" class="transition-all hover:-translate-y-1 ml-1 mr-2 leading-4 align-middle inline-block">
        <a href="/user/{$page.params.id}">
            <h1 class="text-lg font-black ml-2">{userData?.displayName}</h1> 
        </a>
    </div>
    <div class="divider"></div>
    <div class="all-reviews">
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-4xl inline-block font-black">Latest reviews</h2>
        </div>

        <div class="flex flex-col gap-1">
            {#each reviews as review}
                <Review 
                    userPage={true}
                    showLikeText={false}
                    showCommentText={true}
                    commentHref={`${review?.type?.replaceAll("s", "") || ""}/reviews/${review.trackId}/${review.author}`} 
                    likeDoc={`${review.author}`} 
                    reviewRating={review.rating} 
                    reviewMessage={review.message} 
                    reviewAuthor={review.author} 
                    reviewDate={review.date}
                    trackArtist={review.trackAuthor}
                    trackName={review.trackName}
                    trackImage={review.trackHref}
                    reviewType={review.type}
                    trackId={review.trackId}/>
            {/each}
        </div>
    </div>
</div>

<style>

</style>