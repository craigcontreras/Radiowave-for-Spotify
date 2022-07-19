<script>
	import Rating from './../../components/Rating.svelte';
    import TrackReview from "../../components/TrackReview.svelte";
    import { page } from "$app/stores";
	import axios from 'axios';
	import { goto } from '$app/navigation';
	import { browser } from '$app/env';
    import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc } from "firebase/firestore";
    import { onMount } from "svelte";
    import { auth, db } from "../../firebase.js";

    let userLoaded = false;
    let inChangeMode = false;
    let userId = "";
    let key = "N/A";
    let danceability = "N/A";
    let energy = "N/A";
    let valence = "N/A";
    let proposedLabel = "";
    let proposedGenre = "";
    let proposedProducers = "";
    let proposedWriters = "";
    let duration = "";
    let trackData = {};
    let autocompleteResults = [];

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
                const trackPage = axios.get(`https://api.spotify.com/v1/tracks/${$page.params.id}`, {
                    headers: {
                        Authorization: `Bearer ${userAccessToken}`
                    }
                });
                const trackFeatures = axios.get(`https://api.spotify.com/v1/audio-features/${$page.params.id}`, {
                    headers: {
                        Authorization: `Bearer ${userAccessToken}`
                    }
                });
                axios.all([trackPage, trackFeatures]).then(axios.spread(async (...res) => {
                    const trackPageData = res[0];
                    const trackFeaturesData = res[1];
                    const spotifyData = {
                        album: {
                            images: trackPageData.data.album.images,
                            name: trackPageData.data.album.name,
                            artists: trackPageData.data.album.artists,
                            release_date: trackPageData.data.album.release_date,
                            external_urls: trackPageData.data.album.external_urls.spotify,
                            total_tracks: trackPageData.data.album.total_tracks,
                        },
                        analysis: {
                            tempo: trackFeaturesData.data.tempo,
                            time_signature: trackFeaturesData.data.time_signature,
                            key: trackFeaturesData.data.key,
                        },
                        features: {
                            loudness: trackFeaturesData.data.loudness,
                            acousticness: trackFeaturesData.data.acousticness,
                            danceability: trackFeaturesData.data.danceability,
                            energy: trackFeaturesData.data.energy,
                            valence: trackFeaturesData.data.valence,
                        },
                        duration_ms: trackPageData.data.duration_ms,
                        name: trackPageData.data.name,
                        track_number: trackPageData.data.track_number,
                        avgRating: 0,
                        numRatings: 0
                    };

                    await setDoc(doc(db, `tracks/${$page.params.id}`), spotifyData);
                    trackData = spotifyData;
                    matchKey();
                    matchDanceability();
                    matchEnergy();
                    matchValence();
                    duration = millisToMinutesAndSeconds(trackData?.duration_ms);
                })).catch(err => {
                    if (browser) {
                        goto("/error");
                    }
                });
            } else {
                trackData = trackDoc.data();
                matchKey();
                matchDanceability();
                matchEnergy();
                matchValence();
                duration = millisToMinutesAndSeconds(trackData?.duration_ms);
            }
        } else {
            if (browser) {
                goto("/error");
            }
        }
    }

    function matchKey() {
        switch (trackData?.analysis?.time_signature) {
            case 0:
                key = "C";
                break;
            case 1:
                key = "C♯";
                break;
            case 2:
                key = "D";
                break;
            case 3:
                key = "D♯";
                break;
            case 4:
                key = "E";
                break;
            case 5:
                key = "F";
                break;
            case 6:
                key = "F♯";
                break;
            case 7:
                key = "G";
                break;
            case 8:
                key = "G♯";
                break;
            case 9:
                key = "A";
                break;
            case 10:
                key = "A♯";
                break;
            case 11:
                key = "B";
                break;
        }
    }

    function matchDanceability() {
        let danceabilityInt = trackData?.features?.danceability;
        if (danceabilityInt > 0 && danceabilityInt < 0.25) {
            danceability = "Not really danceable";
        } else if (danceabilityInt >= 0.25 && danceabilityInt < 0.50) {
            danceability = "Sorta danceable";
        } else if (danceabilityInt >= 0.50 && danceabilityInt < 0.75) {
            danceability = "Danceable";
        } else if (danceabilityInt >= 0.75 && danceabilityInt <= 1.00) {
            danceability = "Very danceable";
        }
    }

    function matchEnergy() {
        let energyInt = trackData?.features?.energy;
        if (energyInt > 0 && energyInt < 0.25) {
            energy = "Zzzzzzz...";
        } else if (energyInt >= 0.25 && energyInt < 0.50) {
            energy = "Meh...";
        } else if (energyInt >= 0.50 && energyInt < 0.75) {
            energy = "Energetic";
        } else if (energyInt >= 0.75 && energyInt <= 1.00) {
            energy = "Moshpit";
        }
    }

    function matchValence() {
        let valenceInt = trackData?.features?.valence;
        if (valenceInt > 0 && valenceInt < 0.25) {
            valence = "I need therapy type sad";
        } else if (valenceInt >= 0.25 && valenceInt < 0.50) {
            valence = "Sad boy hours";
        } else if (valenceInt >= 0.50 && valenceInt < 0.75) {
            valence = "Happy";
        } else if (valenceInt >= 0.75 && valenceInt <= 1.00) {
            valence = "Pretty happy";
        }
    }

    function enterChangeMode() {
        if (!inChangeMode) {
            inChangeMode = true;
            proposedLabel = trackData?.label;
            proposedGenre = trackData?.genre || "N/A";
            proposedProducers = trackData?.producers || "N/A";
            proposedWriters = trackData?.writers || "N/A";
        } else {
            inChangeMode = false;
        }
    }

    async function submitProposedDetails() {
        await setDoc(doc(db, `tracks/${$page.params.id}`), {
            label: proposedLabel,
            genre: proposedGenre,
            producers: proposedProducers,
            writers: proposedWriters,
        }, {
            merge: true
        });
        return "Changed in Firebase";
    }

    function millisToMinutesAndSeconds(millis) {
        var minutes = Math.floor(millis / 60000);
        var seconds = ((millis % 60000) / 1000).toFixed(0);
        return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
    }
</script>

<div class="mx-6 mt-2 text-sm breadcrumbs">
    <ul>
        <li><a href="/track/top/{new Date().getFullYear()}">Tracks</a></li>
        <li>{trackData?.name}</li>
    </ul>
</div>

<div bind:this={detailElement} class="flex sticky top-[-1px] justify-start">
    <img on:load={() => {
        // const colorThief = new ColorThief();
        // const color = colorThief.getColor(thumbnailElement, 10);
        // console.log(color);
    }} bind:this={thumbnailElement} class:opacity-70={hide} class:scale-50={hide} class="origin-top-left transition-all hover:opacity-100 rounded-lg outline-4 drop-shadow-xl m-6" src={trackData?.album?.images[1]?.url} alt="Album cover"/>
    <div class:opacity-0={hide} class:pointer-events-none={hide} class="transition-opacity flex w-full">
        <div class="my-8 -z-1 basis-3/5">
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
        <div class="my-8 mr-6 float-right basis-2/5">
            <div class="text-sm transition-all hover:-translate-y-1 p-4 drop-shadow-xl rounded-lg bg-gray-800" id="detail-box">
                <h2 class="italic inline text-gray-400">TRACK DETAILS</h2>
                <button class="float-right inline" on:click={enterChangeMode}>Change</button>
                <div id="divider" class="w-full bg-gray-700 h-0.5"></div>
                <p><span class="italic text-gray-400 pr-1">date</span> {trackData?.album?.release_date}</p>
                <p><span class="italic text-gray-400 pr-1">track no.</span> {trackData?.track_number}/{trackData?.album?.total_tracks}</p>
                <p><span class="italic text-gray-400 pr-1">length</span> {duration}</p>
                <form action="" on:submit|preventDefault={async () => {
                    await submitProposedDetails();
                    enterChangeMode();

                    if (browser) {
                        location.reload();
                    }
                }}>
                    <p class="italic text-gray-400">label <span class="not-italic text-white pl-1" class:hidden={inChangeMode}>{trackData?.label || "N/A"}</span><input required on:keyup={async () => {
                        if (proposedLabel !== "" || proposedLabel) {
                            const labelRef = collection(db, "labels");
                            const labelQuery = query(labelRef, orderBy(`searchableIndex.${proposedLabel.toLowerCase()}`), limit(5));
                            const labels = await getDocs(labelQuery);
                            let temp = [];

                            labels.forEach(doc => {
                                temp.push({
                                    name: doc.data().name,
                                    id: doc.id,
                                });
                                temp = temp;
                                autocompleteResults = temp;
                            });
                        }
                    }} bind:value={proposedLabel} class="pl-1 bg-transparent text-white italic" class:hidden={!inChangeMode} placeholder="type here..." type="text"></p>
                    <p class="italic text-gray-400">genres <span class="not-italic text-white pl-1" class:hidden={inChangeMode}>{trackData?.genre || "N/A"}</span><input required bind:value={proposedGenre} class="pl-1 bg-transparent text-white italic" class:hidden={!inChangeMode} placeholder="type here..." type="text"></p>
                    <p class="italic text-gray-400">producers <span class="not-italic text-white pl-1" class:hidden={inChangeMode}>{trackData?.producers || "N/A"}</span><input required bind:value={proposedProducers} class="pl-1 bg-transparent text-white italic" class:hidden={!inChangeMode} placeholder="type here..." type="text"></p>
                    <p class="italic text-gray-400">writers <span class="not-italic text-white pl-1" class:hidden={inChangeMode}>{trackData?.writers || "N/A"}</span><input required bind:value={proposedWriters} class="pl-1 bg-transparent text-white italic" class:hidden={!inChangeMode} placeholder="type here..." type="text"></p>    
                    <button class="rounded-lg px-2 py-1 mt-1 bg-gray-700" class:hidden={!inChangeMode}>Submit</button>
                </form>
            </div>
        </div>
    </div>
</div>

{#each autocompleteResults as result}
    {result.name}
{/each}

<div class="mx-6 divider"></div>
<div class="mx-6" id="track-analysis-features">
    <h2 class="text-4xl font-black mb-4">Analysis & Features</h2>
    <div class="grid grid-flow-row-dense grid-cols-3 gap-4">
        <div class="text-center transition-all hover:-translate-y-1 p-4 drop-shadow-xl rounded-lg bg-gray-800" id="tempo">
            <h2 class="text-4xl font-black">{Math.round(trackData?.analysis?.tempo)} bpm</h2>
            <p class="font-bold">Tempo</p>
        </div>
        <div class="text-center transition-all hover:-translate-y-1 p-4 drop-shadow-xl rounded-lg bg-gray-800" id="time-signature">
            <h2 class="text-4xl font-black">{trackData?.analysis?.time_signature}/4</h2>
            <p class="font-bold">Time Signature</p>
        </div>
        <div class="text-center transition-all hover:-translate-y-1 p-4 drop-shadow-xl rounded-lg bg-gray-800" id="key">
            <h2 class="text-4xl font-black">{key}</h2>
            <p class="font-bold">Key</p>
        </div>
        <div class="flex flex-col items-center justify-center transition-all hover:-translate-y-1 p-4 drop-shadow-xl rounded-lg bg-gray-800" id="danceability">
            <h2 class="text-4xl mb-1 font-black">{Math.round(trackData?.features?.danceability * 100)}%</h2>
            <div class="w-8/12 bg-gray-200 h-1">
                <div class="bg-blue-600 h-1" style="width: {trackData?.features?.danceability * 100}%"></div>
            </div>
            <p class="font-bold mt-1">Danceability</p>
            <p class="italic text-sm font-semibold">{danceability}</p>
        </div>
        <div class="flex flex-col items-center justify-center transition-all hover:-translate-y-1 p-4 drop-shadow-xl rounded-lg bg-gray-800" id="energy">
            <h2 class="text-4xl mb-1 font-black">{Math.round(trackData?.features?.energy * 100)}%</h2>
            <div class="w-8/12 bg-gray-200 h-1">
                <div class="bg-blue-600 h-1" style="width: {trackData?.features?.energy * 100}%"></div>
            </div>
            <p class="font-bold mt-1">Energy</p>
            <p class="italic text-sm font-semibold">{energy}</p>
        </div>
        <div class="flex flex-col items-center justify-center transition-all hover:-translate-y-1 p-4 drop-shadow-xl rounded-lg bg-gray-800" id="valence">
            <h2 class="text-4xl mb-1 font-black">{Math.round(trackData?.features?.valence * 100)}%</h2>
            <div class="w-8/12 bg-gray-200 h-1">
                <div class="bg-blue-600 h-1" style="width: {trackData?.features?.valence * 100}%"></div>
            </div>
            <p class="font-bold mt-1">Happiness</p>
            <p class="italic text-sm font-semibold">{valence}</p>
        </div>
    </div>
</div>
<div class="mx-6 divider"></div>

<div class="mx-6">
    <h2 class="text-4xl font-black">Recommendations</h2>
</div>

<div class="mx-6 divider"></div>

<div class="mx-6">
    <h2 class="text-4xl font-black">User Activity</h2>
</div>

<div class="mx-6 divider"></div>

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