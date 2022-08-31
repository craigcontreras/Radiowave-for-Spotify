<script context="module">
	import { page } from '$app/stores';
    import { collection, documentId, getDocs, limit, orderBy, query, startAfter, where } from "firebase/firestore";
    import { db } from "../../../firebase";

    let trackData = [];
    let recentTracks = [];
    let lastVisible;
    let currentLabelSize;

    export async function load({params}) {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
        const dateObj = new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));

        var text = /^[0-9]+$/;

        if (!text.test(params.year)) {
            throw new Error("Only numbers are allowed");
        }

        if (parseInt(params.year) > dateObj.getFullYear()) {
            throw new Error("Invalid year");
        }

        trackData = [];
        recentTracks = [];
        await loginToFirebase(params);
        return {
            props: {
                trackData,
                lastVisible,
                currentLabelSize,
                recentTracks
            }
        }
    }

    async function loginToFirebase(params) {        
        const trackReference = collection(db, "tracks");
        const trackQuery = query(trackReference, where("year", "==", parseInt(params.year)), orderBy("avgRating", "desc"), limit(25));
        const trackDocs = await getDocs(trackQuery);

        lastVisible = trackDocs.docs[trackDocs.docs.length - 1];
        currentLabelSize = trackDocs.docs.length;

        trackDocs.forEach(doc => {
            let ratingColor = "";

            if (doc.data().avgRating >= 0 && doc.data().avgRating < 50) {
                ratingColor = "bg-red-600";
            } else if (doc.data().avgRating >= 50 && doc.data().avgRating < 70) {
                ratingColor = "bg-yellow-400";
            } else if (doc.data().avgRating >= 70 && doc.data().avgRating <= 100) {
                ratingColor = "bg-green-600";
            }

            trackData.push({
                ...doc.data(),
                id: doc.id,
                ratingColor,
            });
            trackData = trackData;
        });

        const recentTracksQuery = query(trackReference, orderBy("album.release_date", "desc"), limit(5));
        const recentTracksDocs = await getDocs(recentTracksQuery);
        recentTracksDocs.forEach(doc => {
            let ratingColor = "";

            if (doc.data().avgRating >= 0 && doc.data().avgRating < 50) {
                ratingColor = "bg-red-600";
            } else if (doc.data().avgRating >= 50 && doc.data().avgRating < 70) {
                ratingColor = "bg-yellow-400";
            } else if (doc.data().avgRating >= 70 && doc.data().avgRating <= 100) {
                ratingColor = "bg-green-600";
            }

            recentTracks.push({
                id: doc.id, 
                ratingColor,
                ...doc.data()
            });
            recentTracks = recentTracks;
        });
        return "Completed";
    }
</script>

<script>
    import Rating from '../../../components/static/Rating.svelte';
    import { onMount } from 'svelte';
    
    export let trackData = [];
    export let recentTracks = [];
    export let lastVisible;
    export let currentLabelSize;

    onMount(() => {
        window.onscroll = function (event) {
            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight && currentLabelSize >= 3) {
                paginateData();
            }
        }
    });

    async function paginateData() {
        if (lastVisible || currentLabelSize < 10) {            
            const trackReference = collection(db, "tracks");
            const trackQuery = query(trackReference, where("year", "==", parseInt($page.params.year)), orderBy("avgRating", "desc"), startAfter(lastVisible), limit(10));
            const trackDocs = await getDocs(trackQuery);

            lastVisible = trackDocs.docs[trackDocs.docs.length - 1];
            currentLabelSize = trackDocs.docs.length;

            trackDocs.forEach((doc) => {
                let ratingColor = "";

                if (doc.data().avgRating >= 0 && doc.data().avgRating < 50) {
                    ratingColor = "bg-red-600";
                } else if (doc.data().avgRating >= 50 && doc.data().avgRating < 70) {
                    ratingColor = "bg-yellow-400";
                } else if (doc.data().avgRating >= 70 && doc.data().avgRating <= 100) {
                    ratingColor = "bg-green-600";
                }

                trackData.push({
                    ...doc.data(),
                    id: doc.id,
                    ratingColor,
                });
                trackData = trackData;
            });
        }
    }
</script>

<div class="mx-6 page">
    <div class="my-2 text-sm breadcrumbs">
        <ul>
            <li><a href="/track/top/{new Date().getFullYear()}">Tracks</a></li>
            <li><a href="/track/top/{$page.params.year}">Top of {$page.params.year}</a></li>
        </ul>
    </div>
    <div class="content mt-6 flex">
        <div class="basis-10/12 top-tracks">
            {#if trackData.length === 0}
                <p>Ho tracks found.</p>
            {/if}
            {#each trackData as data, id}
                <div class="track mb-4">
                    <img height=150 width=150 class="h-[150px] w-[150px] rounded-lg drop-shadow-xl align-top inline-block" src="{data?.album?.images[1]?.url}" alt="">
                    <div class="inline-block ml-2 align-top track-details">
                        <h2 class="text-xl"><span class="font-black">{id + 1}.</span> <a class="hover:underline" href="/artist/{data?.album?.artists[0]?.id}">{data?.album?.artists[0]?.name}</a> - <a class="hover:underline" href="/track/{data?.id}">{data?.name}</a></h2>
                        <p class="mt-1 text-lg opacity-50">Released on {data?.album?.release_date?.toDate().getUTCFullYear()}-{data?.album?.release_date?.toDate().getUTCMonth() + 1}-{data?.album?.release_date?.toDate().getUTCDate()}</p>
    
                        <div class="rating">
                            <div class="w-16 mt-4 drop-shadow-xl align-bottom">
                                <Rating bind:ratingColor={data.ratingColor} avgRating={data?.avgRating}/>
                            </div>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
        <div class="basis-2/12 top-6 h-full sidebar sticky">
            <div class="recent-releases bg-black p-4 rounded-lg drop-shadow-xl">
                <h2 class="text-sm text-gray-400 italic">RECENT RELEASES</h2>
                <div id="divider" class="w-full bg-stone-900 h-0.5"></div>
                <div class="tracks">
                    {#each recentTracks as track}
                        <div class="track">
                            <div class="w-6 mt-4 drop-shadow-xl align-bottom inline-block">
                                <Rating textSize="text-sm" avgRating={track.avgRating} bind:ratingColor={track.ratingColor}/>
                            </div>
                            <div class="details ml-2 align-bottom inline-block">
                                {#if track.album.artists[0].name.length >= 16}
                                    <a href="/artist/{track.album.artists[0].id}" class="block text-sm italic hover:underline">{track.album.artists[0].name.substring(0, 14)}...</a>
                                {:else}
                                    <a href="/artist/{track.album.artists[0].id}" class="block text-sm italic hover:underline">{track.album.artists[0].name}</a>
                                {/if}
                                {#if track.name.length >= 16}
                                    <a href="/track/{track.id}" class="block text-sm hover:underline">{track.name.substring(0, 14)}...</a>
                                {:else}
                                    <a href="/track/{track.id}" class="block text-sm hover:underline">{track.name}</a>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    </div>
</div>

<style>

</style>