<script context="module">
	import SEO from './../components/utilities/SEO.svelte';
    import { collection, orderBy, query, getDocs, limit, getDoc } from "firebase/firestore";
    import { db, auth } from "../firebase.js";

    let tracks = [];
    let userLoaded = false;
    let invalidUser = true;
    let reviews = [];

    export async function load({params}) {
        tracks = [];
        await loginToFirebase(params);
        return {
            props: {
                invalidUser,
                tracks,
                reviews
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

    async function loginToFirebase(params) {
        const user = await getCurrentUser();
        if (user !== null) {
            invalidUser = false;
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
        const reviewStatsQuery = query(reviewStatsRef, orderBy(`stats.${date}.likes`, "desc"), limit(3));
        const reviews = await getDocs(reviewStatsQuery);
        
        reviews.forEach(async (doc) => {
            const data = doc.data();
            const review = await getDoc(doc(db, `${data.type}/${data.track}/reviews/${data.author}`));
            reviews.push(review.data());
            reviews = reviews;
        });

        return "Completed";
    }
</script>

<script>
    import BigTrackThumbnail from "../components/thumbnails/BigTrackThumbnail.svelte";

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
    </div>
    <div class="divider"></div>
    <div class="popular-lists">
        <h2 class="text-4xl font-black mb-4">Trending lists</h2>
    </div>
</div>

<style>

</style>