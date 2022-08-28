<script context="module">
	import { page } from '$app/stores';
    import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import Rating from '../../../components/static/Rating.svelte';
    import { db } from "../../../firebase";

    let trackData = [];

    export async function load({params}) {
        trackData = [];
        await loginToFirebase(params);
        return {
            props: {
                trackData,
            }
        }
    }

    async function loginToFirebase(params) {        
        const trackReference = collection(db, "tracks");
        const trackQuery = query(trackReference, where("year", "==", parseInt(params.year)), orderBy("avgRating", "desc"), limit(25));
        const trackDocs = await getDocs(trackQuery);
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
        return "Completed";
    }
</script>

<script>
    export let trackData = [];
</script>

<div class="mx-6 page">
    <div class="my-2 text-sm breadcrumbs">
        <ul>
            <li><a href="/track/top/{new Date().getFullYear()}">Tracks</a></li>
            <li><a href="/track/top/{$page.params.year}">Top of {$page.params.year}</a></li>
        </ul>
    </div>
    <div class="content mt-6">
        {#each trackData as data, id}
            <div class="track">
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
            <div class="divider"></div>
        {/each}
    </div>
</div>

<style>

</style>