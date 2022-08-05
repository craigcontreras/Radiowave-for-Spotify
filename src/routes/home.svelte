<script context="module">
	import SEO from './../components/utilities/SEO.svelte';
    import { collection, orderBy, query, getDocs, limit, getDoc, doc } from "firebase/firestore";
    import { db, auth } from "../firebase.js";
    import axios from "axios";

    let tracks = [];
    let userLoaded = false;
    let invalidUser = true;
    let trendingReviews = [];
    let latestReleases = [];

    export async function load({params}) {
        tracks = [];
        trendingReviews = [];
        latestReleases = [];
        await loginToFirebase(params);
        return {
            props: {
                invalidUser,
                tracks,
                trendingReviews,
                latestReleases,
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
        });
    }

    async function grabLatestReleasesFromSpotify(access) {
        try {
            const releases = await axios.get("https://api.spotify.com/v1/browse/new-releases", {
                headers: {
                    Authorization: `Bearer ${access}`
                },
                params: {
                    limit: 16
                }
            });

            latestReleases = releases.data.albums.items;
        } catch (err) {
            await grabLatestReleasesFromFirebase();
        }
        return "Completed";
    }

    async function grabLatestReleasesFromFirebase() {
        const trackReference = collection(db, `tracks`);
        const trackQuery = query(trackReference, orderBy("album.release_date", "desc"), limit(16));
        const allTracks = await getDocs(trackQuery);

        allTracks.forEach(doc => {
            latestReleases.push({data: doc.data(), id: doc.id});
            latestReleases = latestReleases;
        });

        return "Completed";
    }

    async function loginToFirebase(params) {
        const user = await getCurrentUser();
        if (user !== null) {
            invalidUser = false;
            const userDoc = await getDoc(doc(db, `users/${user.uid}`));
            await grabLatestReleasesFromSpotify(userDoc.data().access);
        } else {
            await grabLatestReleasesFromFirebase();
        }

        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
        const dateObj = new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
        const date = `${dateObj.getFullYear()}-${dateObj.getMonth() + 1}-${dateObj.getDate()}`;

        const statsRef = collection(db, `statistics`);
        const statsQuery = query(statsRef, orderBy(`stats.${date}.pageViews`, "desc"), limit(16));
        const stats = await getDocs(statsQuery);

        stats.forEach(doc => {
            tracks.push(doc.data());
            tracks = tracks;
        });

        const reviewStatsRef = collection(db, `review-statistics`);
        const reviewStatsQuery = query(reviewStatsRef, orderBy(`stats.${date}.likes`, "desc"), limit(4));
        const reviews = await getDocs(reviewStatsQuery);
        let tempCollection = [];
        
        reviews.forEach((doc) => {
            tempCollection.push(doc.data());
            tempCollection = tempCollection;
        })

        for (const data of tempCollection) {
            const review = await getDoc(doc(db, `${data.type}/${data.track}/reviews/${data.author}`));
            trendingReviews.push(review.data());
            trendingReviews = trendingReviews;
        }

        return "Completed";
    }
</script>

<script>
    import OffPageReview from "../components/static/OffPageReview.svelte";
    import BigTrackThumbnail from "../components/thumbnails/BigTrackThumbnail.svelte";

    export let latestReleases = [];
    export let trendingReviews = [];
    export let tracks = [];
    export let invalidUser = false;
</script>

<SEO title="Home - Radiowave for Spotify" description="View your Spotify account stats and review music from Spotify's extensive back catalog on Radiowave for Spotify." image=""/>
<div class="mx-6">
    {#if !invalidUser}
        <div class="following-recently-played">
            <h2 class="text-4xl font-black mb-4">Following</h2>
        </div>
        <div class="divider"></div>
        <div class="new-releases">
            <h2 class="text-4xl font-black mb-4">New releases</h2>
            <div class="content">
                <div class="grid grid-flow-row-dense grid-cols-8 gap-4">
                    {#each latestReleases as releases}
                        <BigTrackThumbnail title={releases.name}
                        artist={releases.artists[0].name} src={releases.images[1].url} alt="" 
                        href="/album/{releases.id}" date={releases.release_date} classes=""/>
                    {/each}
                </div>
            </div>
        </div>
        <div class="divider"></div>
    {:else}
        <div class="new-releases-no-spotify">
            <h2 class="text-4xl font-black mb-4">New releases</h2>
            <div class="content">
                <div class="grid grid-flow-row-dense grid-cols-8 gap-4">
                    {#each latestReleases as releases}
                        <BigTrackThumbnail title={releases.data.name}
                        artist={releases.data.primary_artist} src={releases.data.album.images[1].url} alt="" 
                        href="/track/{releases.id}" date={releases.data.album.release_date} classes=""/>
                    {/each}
                </div>
            </div>
        </div>
        <div class="divider"></div>
    {/if}
    <div class="popular-now">
        <h2 class="text-4xl font-black mb-4">Trending now</h2>
        <div class="content grid grid-flow-row-dense grid-cols-8 gap-4">
            {#each tracks as track}
                <BigTrackThumbnail title={track.name}
                    artist={track.artist} src={track.image} alt="" 
                    href={track.href} date={track.release_date} classes=""/>
            {/each}
        </div>
    </div>
    <div class="divider"></div>
    <div class="popular-reviews">
        <h2 class="text-4xl font-black mb-4">Trending reviews</h2>
        <div class="content grid grid-flow-row-dense grid-cols-2 gap-4">
            {#each trendingReviews as review}
                <OffPageReview likeCount={review.likeCount} reviewMessage={review.message} trackAuthor={review.trackAuthor} trackName={review.trackName} trackImage={review.trackHref} trackId={review.trackId} reviewAuthor={review.author} reviewType={review.type}/>
            {/each}
        </div>
    </div>
    <div class="divider"></div>
    <div class="popular-lists">
        <h2 class="text-4xl font-black mb-4">Trending lists</h2>
    </div>
</div>

<style>

</style>