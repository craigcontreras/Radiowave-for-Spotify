<script>
	import Rating from './../../components/Rating.svelte';
    import TrackReview from "../../components/TrackReview.svelte";
    import { page } from "$app/stores";
	import axios from 'axios';
	import { goto } from '$app/navigation';
	import { browser } from '$app/env';
    import { doc, getDoc, setDoc } from "firebase/firestore";
    import { onMount } from "svelte";
    import { auth, db } from "../../firebase.js";

    let userLoaded = false;
    let userId = "";
    let trackData = {};

    //svelte binding elements for dom
    let detailElement;
    let thumbnailElement;

    //intersection observer shit
    let hide = false;
    
    onMount(() => {
        loginToFirebase();
        //for the detail element changing position
        if (browser) {
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.intersectionRatio < 1) {
                        hide = true;
                    } else {
                        hide = false;
                    }
                });
            }, {
                threshold: 1.0
            });
            observer.observe(detailElement);
        }
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
        });
    }

    async function loginToFirebase() {
        const user = await getCurrentUser();
        if (user !== null) {
            userId = user.uid;
            const userDoc = await getDoc(doc(db, `users/${user.uid}`));
            const userAccessToken = userDoc.data().access;
            const trackDoc = await getDoc(doc(db, `tracks/${$page.params.id}`));

            if (!trackDoc.exists()) {
                axios.get(`https://api.spotify.com/v1/tracks/${$page.params.id}`, {
                    headers: {
                        Authorization: `Bearer ${userAccessToken}`
                    }
                }).then(async (res) => {
                    const spotifyData = {
                        album: res.data.album,
                        artists: res.data.artists,
                        available_markets: res.data.available_markets,
                        disc_number: res.data.disc_number,
                        duration_ms: res.data.duration_ms,
                        explicit: res.data.explicit,
                        href: res.data.href,
                        id: res.data.id,
                        is_local: res.data.is_local,
                        name: res.data.name,
                        popularity: res.data.popularity,
                        preview_url: res.data.preview_url,
                        track_number: res.data.track_number,
                        type: res.data.type,
                        uri: res.data.uri,
                        avgRating: 0,
                        numRatings: 0
                    };

                    await setDoc(doc(db, `tracks/${$page.params.id}`), spotifyData);
                    trackData = spotifyData;
                }).catch(err => {
                    if (browser) {
                        goto("/error");
                    }
                });
            } else {
                trackData = trackDoc.data();
            }
        } else {
            if (browser) {
                goto("/error");
            }
        }
    }
</script>

<div bind:this={detailElement} class="flex sticky top-[-1px] justify-start">
    <img on:load={() => {
        // const colorThief = new ColorThief();
        // const color = colorThief.getColor(thumbnailElement, 10);
        // console.log(color);
    }} bind:this={thumbnailElement} class:opacity-70={hide} class:scale-50={hide} class="origin-top-left transition-all hover:opacity-100 rounded-lg outline-4 drop-shadow-xl m-6" src={trackData?.album?.images[1]?.url} alt="Album cover"/>
    <div class:opacity-0={hide} class:pointer-events-none={hide} class="transition-opacity">
        <div class="my-8">
            <h1 class="text-6xl font-black">{trackData?.name}</h1> 
            <h2 class="text-4xl font-bold">by {trackData?.album?.artists[0]?.name}</h2>
            <h3 class="text-2xl font-medium">on {trackData?.album?.name}</h3>
    
            <div class="w-16 mt-4">
                <Rating avgRating={trackData?.avgRating}/>
            </div>
            {#if trackData?.numRatings === 1}
                <p class="my-1 italic">based on {trackData?.numRatings} rating</p>
            {:else}
                <p class="my-1 italic">based on {trackData?.numRatings} ratings</p>
            {/if}
        </div>    
    </div>
</div>

<div class="divider"></div>

<div class="mx-6">
    <h2 class="text-4xl font-black">Reviews</h2>
    {#if trackData?.numRatings === 1}
        <h3 class="text-2xl font-bold">{trackData?.numRatings} review</h3>
    {:else}
        <h3 class="text-2xl font-bold">{trackData?.numRatings} reviews</h3>
    {/if}
    <TrackReview trackId={$page.params.id} {userId}/>
</div>

<style>

</style>