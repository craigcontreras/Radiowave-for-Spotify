<script context="module">
	import SEO from './../../components/utilities/SEO.svelte';
    import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc } from "firebase/firestore";
    import { auth, db } from "../../firebase.js";

    let userLoaded = false;
    let ifIsUser = false;
    let userDataDocument;
    let userData;
    let invalidUser = true;
    let usersLists = [];

    export async function load({params}) {
        usersLists = [];
        await loginToFirebase(params);
        return {
            props: {
                ifIsUser,
                userDataDocument,
                userData,
                invalidUser,
                usersLists,
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
        userDataDocument = await getDoc(doc(db, `users/${params.id}`));
        if (userDataDocument.exists()) {
            userData = userDataDocument.data();
            const usersListsQuery = query(collection(db, `users/${params.id}/lists`), orderBy("lastModified", "desc"), limit(4));
            const usersListsDocs = await getDocs(usersListsQuery);
            usersListsDocs.forEach(doc => {
                let fiveImages = [];
                if (doc.data().tracks.length < 5) {
                    for (const track of doc.data().tracks) {
                        fiveImages.push(track.image);
                        fiveImages = fiveImages;
                    }
                } else {
                    for (const track of doc.data().tracks.slice(0, 5)) {
                        fiveImages.push(track.image);
                        fiveImages = fiveImages;
                    }
                }
                usersLists.push({
                    ...doc.data(),
                    fiveImages,
                });
                usersLists = usersLists;
            })
        } else {
            throw new Error("User does not exist");
        }
        if (user !== null && userDataDocument.id === user.uid) {
            ifIsUser = true;
            invalidUser = false;
        }

        return "Completed";
    }
</script>

<script>
	import { marked } from 'marked';
	import Icon from 'svelte-awesome';
    import Pusher from "pusher-js";
    import { faYoutube } from '@fortawesome/free-brands-svg-icons/faYoutube';
    import { faTwitter } from '@fortawesome/free-brands-svg-icons/faTwitter';
    import { faInstagram } from '@fortawesome/free-brands-svg-icons/faInstagram';
    import { faFacebook } from '@fortawesome/free-brands-svg-icons/faFacebook';
    import { faGlobe } from '@fortawesome/free-solid-svg-icons/faGlobe';
    import { slide } from "svelte/transition";
	import { page, session } from '$app/stores';
    import { browser } from "$app/env";
    import { goto } from "$app/navigation";
    import { onMount, onDestroy } from "svelte";
    import DOMPurify from "isomorphic-dompurify";
    import { get } from 'svelte/store';
    import List from '../../components/static/List.svelte';

    let editBiography = "";
    $: sanitizedBiography = DOMPurify.sanitize(editBiography, {ALLOWED_TAGS: [], ALLOWED_ATTR: []});
    export let userData = {};
    let changeMode = false;
    export let ifIsUser = false;
    export let invalidUser = true;
    let biographyCollapsed = false;
    let photoHref = "https://firebasestorage.googleapis.com/v0/b/radiowavemusic.appspot.com/o/images%2Fno%20photo%20found.jpg?alt=media&token=678e386f-707c-4ca7-881b-4fbe90db8ca7";

    let twitterLink = "";
    let instagramLink = "";
    let youtubeLink = "";
    let facebookLink = "";
    let websiteLink = "";

    let recentPlays = [];
    let dateRange = "short_term";
    let dateRangeArtists = "short_term";

    const pusher = new Pusher("5e07f212c04ae7ccbb27", {
        cluster: "us2"
    });

    let tracksPastFourWeeks = [];
    let tracksPastSixMonths = [];
    let tracksLifetime = [];

    let artistsPastFourWeeks = [];
    let artistsPastSixMonths = [];
    let artistsLifetime = [];

    let genresWeeksData = [];
    let genresWeeksLabels = [];
    let genresMonthsData = [];
    let genresMonthsLabels = [];
    let genresLifetimeData = [];
    let genresLifetimeLabels = [];

    export let usersLists = [];

    let options = {
        chart: {
            type: "pie",
        },
    };

    let chartMethod;
    let chartLoaded = false;

    const {userAgent} = get(session);

    onMount(async () => {
        loginToFirebase();
        const { chart } = await import("svelte-apexcharts");
        chartMethod = chart;
        chartLoaded = true;
    });

    onDestroy(() => {
        pusher.unsubscribe("cache-recently-played");
    });

    async function loginToFirebase() {
        const channel = pusher.subscribe("cache-recently-played");
        channel.bind($page.params.id, data => {
            recentPlays = data.data || [];
        });

        channel.bind("pusher:cache_miss", data => {
            recentPlays = data.data || [];
        });

        if (userData?.photoURL) {
            photoHref = userData?.photoURL;
        }
        editBiography = userData?.biography;
        websiteLink = userData?.websiteHref;
        youtubeLink = userData?.youtubeHref;
        twitterLink = userData?.twitterHref;
        instagramLink = userData?.instagramHref;
        facebookLink = userData?.facebookHref;
        tracksLifetime = userData?.tracksPastLifetime;
        tracksPastFourWeeks = userData?.tracksPastFourWeeks;
        tracksPastSixMonths = userData?.tracksPastSixMonths;
        artistsLifetime = userData?.artistsPastLifetime;
        artistsPastFourWeeks = userData?.artistsPastFourWeeks;
        artistsPastSixMonths = userData?.artistsPastSixMonths;

        for (const [key, value] of Object.entries(userData?.genresFourWeeks)) {
            genresWeeksData.push(value);
            genresWeeksLabels.push(key);
            genresWeeksData = genresWeeksData;
            genresWeeksLabels = genresWeeksLabels;
        }

        for (const [key, value] of Object.entries(userData?.genresSixMonths)) {
            genresMonthsData.push(value);
            genresMonthsLabels.push(key);
            genresMonthsData = genresMonthsData;
            genresMonthsLabels = genresMonthsLabels;
        }

        for (const [key, value] of Object.entries(userData?.genresSixMonths)) {
            genresLifetimeData.push(value);
            genresLifetimeLabels.push(key);
            genresLifetimeData = genresLifetimeData;
            genresLifetimeLabels = genresLifetimeLabels;
        }

        options = {
            chart: {
                type: "pie",
                foreColor: "#FFFFFF",
            },
            series: genresWeeksData,
            labels: genresWeeksLabels,
        }
    }

    function enterChangeMode() {
        changeMode = !changeMode;
        biographyCollapsed = true;
    }

    async function fetchRecentReviews() {

    }
</script>

<SEO height=460 width=460 title="{userData?.displayName} - Users - Radiowave for Spotify" description="View {userData?.displayName}'s Spotify stats like recently played, top artists & tracks, and their latest reviews on Radiowave for Spotify." image="{userData?.photoURL}"/>

<div class="page mx-6">
    <div class="mt-2 text-sm breadcrumbs">
        <ul>
            <li><a href="/user/all">Users</a></li>
            <li>{userData?.displayName}</li>
        </ul>
    </div>
    
    <div class="flex justify-between mt-6">
        <div class="header sticky top-6 h-full basis-1/5 flex flex-col justify-center items-center">
            <span class="max-w-[10rem]">
                <span>
                    <img class="rounded-full drop-shadow-xl hover:-translate-y-1 transition-all h-40 w-40 min-h-[10rem] min-w-[10rem]" src={photoHref} alt="">
                </span>
                <h2 class="text-2xl break-words text-center font-black mt-4">{userData?.displayName}</h2>
            </span>
            {#if !invalidUser}
            <button class="transition-all hover:text-white hover:bg-stone-900 hover:-translate-y-1 border-2 border-stone-900 py-1 px-2 mt-2 rounded-lg drop-shadow-xl">Follow</button>
            {/if}
            <div class="history w-3/4 mt-4 text-xs transition-all hover:-translate-y-1 p-4 drop-shadow-xl rounded-lg bg-black">
                <h2 class="italic inline text-gray-400">BIO</h2>
                <button class="float-right inline" on:click={() => {
                    biographyCollapsed = !biographyCollapsed;
                }}>Collapse</button>
                
                {#if biographyCollapsed}
                    <div transition:slide>
                        <div id="divider" class="w-full bg-gray-700 h-0.5"></div>
                        {#if changeMode}
                            <form action="" on:submit|preventDefault={async () => {
                                await setDoc(doc(db, `users/${$page.params.id}`), {
                                    biography: sanitizedBiography,
                                }, {
                                    merge: true
                                });
                                if (browser) {
                                    location.reload();
                                }
                            }}>
                                <textarea class="w-full bg-transparent" bind:value={editBiography} name="" id="" cols="30" rows="10"></textarea>
                                <button class="mt-1 float-right block text-xs py-1 px-2 bg-stone-800 rounded-lg drop-shadow-xl">Submit</button>    
                            </form>
                        {:else}
                            <div id="biography">{@html marked(sanitizedBiography)}</div>
                        {/if}
                    </div>
                {/if}
            </div>

            {#if changeMode}
                <div class="social-media-links w-3/4 mt-4 text-xs transition-all hover:-translate-y-1 p-4 drop-shadow-xl rounded-lg bg-black">
                    <h2 class="italic inline text-gray-400">SOCIALS</h2>
                    <div id="divider" class="w-full bg-gray-700 h-0.5"></div>
                    <form action="" on:submit|preventDefault={async () => {
                        await setDoc(doc(db, `users/${$page.params.id}`), {
                            twitterHref: twitterLink || "",
                            youtubeHref: youtubeLink || "",
                            websiteHref: websiteLink || "",
                            instagramHref: instagramLink || "",
                            facebookHref: facebookLink || "",
                        }, {
                            merge: true,
                        });

                        if (browser) {
                            location.reload();
                        }
                    }}>
                        <div class="block">
                            <label class="inline-block align-middle" for="twitter"><Icon data={faTwitter}/></label>
                            <input id="twitter" bind:value={twitterLink} placeholder="twitter link" class="ml-1 inline-block align-middle w-5/6 bg-transparent" type="text">
                        </div>
                        <div class="block">
                            <label class="inline-block align-middle" for="instagram"><Icon data={faInstagram}/></label>
                            <input id="instagram" bind:value={instagramLink} placeholder="instagram link" class="ml-1 inline-block align-middle w-5/6 bg-transparent" type="text">
                        </div>
                        <div class="block">
                            <label class="inline-block align-middle" for="facebook"><Icon data={faFacebook}/></label>
                            <input id="facebook" bind:value={facebookLink} placeholder="facebook link" class="ml-1 inline-block align-middle w-5/6 bg-transparent" type="text">
                        </div>
                        <div class="block">
                            <label class="inline-block align-middle" for="youtube"><Icon data={faYoutube}/></label>
                            <input id="youtube" bind:value={youtubeLink} placeholder="youtube link" class="ml-1 inline-block align-middle w-5/6 bg-transparent" type="text">
                        </div>
                        <div class="block">
                            <label class="inline-block align-middle" for="website"><Icon data={faGlobe}/></label>
                            <input id="website" bind:value={websiteLink} placeholder="website link" class="ml-1 inline-block align-middle w-5/6 bg-transparent" type="text">
                        </div>
                        <button class="mt-1 float-right block text-xs py-1 px-2 bg-stone-800 rounded-lg drop-shadow-xl">Submit</button>    
                    </form>
                </div>
            {/if}

            {#if !changeMode && (userData?.twitterHref?.trim() !== "" || userData?.instagramHref?.trim() !== "" || userData?.facebookHref?.trim() !== "" || userData?.youtubeHref?.trim() !== "" || userData?.websiteHref?.trim() !== "")}
                <div class="socials mt-6 text-xs w-3/4 flex justify-evenly drop-shadow-lg">
                    {#if userData?.twitterHref}
                        <a class="transition-all hover:-translate-y-[0.10rem]" href="{userData?.twitterHref}"><Icon data={faTwitter}/></a>
                    {/if}
                    {#if userData?.instagramHref}
                        <a class="transition-all hover:-translate-y-[0.10rem]" href="{userData?.instagramHref}"><Icon data={faInstagram}/></a>
                    {/if}
                    {#if userData?.facebookHref}
                        <a class="transition-all hover:-translate-y-[0.10rem]" href="{userData?.facebookHref}"><Icon data={faFacebook}/></a>
                    {/if}
                    {#if userData?.youtubeHref}
                        <a class="transition-all hover:-translate-y-[0.10rem]1" href="{userData?.youtubeHref}"><Icon data={faYoutube}/></a>
                    {/if}
                    {#if userData?.websiteHref}
                        <a class="transition-all hover:-translate-y-[0.10rem]" href="{userData?.websiteHref}"><Icon data={faGlobe}/></a>
                    {/if}
                </div>
            {/if}
            {#if ifIsUser}
                <button class="text-xs my-6 opacity-10 transition-all hover:opacity-100 self-start" on:click={enterChangeMode}>Change</button>
            {/if}
        </div>
        <div class="content basis-4/5 pr-14">
            {#if recentPlays.length !== 0}
                <div class="recent-plays">
                    <h2 class="text-4xl mb-4 font-black">Recent plays <span class="text-xs font-normal opacity-50">updates every 40 minutes</span></h2>
                    <div class="flex flex-col gap-1 fade-bottom">
                        {#each recentPlays.slice(0, 5) as item}
                            <a href="/track/{item.id}" class="px-4 py-1 hover:-translate-y-1 hover:bg-base-200 transition-all flex justify-between items-center">
                                <div class="inline-flex items-center gap-6">
                                    <img class="rounded-lg drop-shadow-xl h-[50px] w-[50px] max-h-full max-w-full" src={item.image} alt="">
                                    <p class="font-bold">{item.name}</p>
                                    <p class="text-xs">{new Date(item.played_at).getFullYear()}-{new Date(item.played_at).getMonth() + 1}-{new Date(item.played_at).getDate()} @ {new Date(item.played_at).getHours()}:{new Date(item.played_at).getMinutes()}</p> 
                                </div>
                                <p>{item.artist}</p>
                            </a>
                        {/each}
                    </div>
                    <div class="flex justify-center relative -top-4 opacity-50">
                        <a href="{$page.params.id}/recent-plays" class="hover:-translate-y-1 transition-all text-2xl font-bold">View all</a>
                    </div>
                </div>
            {/if}
            <div class="top-tracks mt-6">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-4xl inline-block font-black">Top tracks</h2>
                    <div class="inline-block">
                        <button class="px-2 py-1 bg-stone-800 hover:bg-stone-900 transition-all rounded-tl-lg rounded-bl-lg" on:click={() => {
                            dateRange = "short_term";
                        }}>past 4 weeks</button>
                        <button class="px-2 py-1 bg-stone-800 hover:bg-stone-900 transition-all" on:click={() => {
                            dateRange = "medium_term";
                        }}>past 6 months</button>
                        <button class="px-2 py-1 bg-stone-800 hover:bg-stone-900 transition-all rounded-tr-lg rounded-br-lg" on:click={() => {
                            dateRange = "long_term";
                        }}>lifetime</button>
                    </div>
                </div>

                {#if dateRange === "short_term"}
                    <div class="flex flex-col gap-1 fade-bottom">
                        {#each tracksPastFourWeeks.slice(0, 5) as item, id}
                            <a href="/track/{item.id}" class="px-4 py-1 hover:-translate-y-1 hover:bg-base-200 transition-all flex justify-between items-center">
                                <div class="inline-flex items-center gap-6">
                                    <p class="font-black">#{id + 1}</p>
                                    <img class="rounded-lg drop-shadow-xl h-[50px] w-[50px] max-h-full max-w-full" src={item.image} alt="">
                                    <p class="font-bold">{item.name}</p>
                                </div>
                                <p>{item.artist}</p>
                            </a>
                        {/each}
                    </div>
                {:else if dateRange === "medium_term"}
                    <div class="flex flex-col gap-1 fade-bottom">
                        {#each tracksPastSixMonths.slice(0, 5) as item, id}
                            <a href="/track/{item.id}" class="px-4 py-1 hover:-translate-y-1 hover:bg-base-200 transition-all flex justify-between items-center">
                                <div class="inline-flex items-center gap-6">
                                    <p class="font-black">#{id + 1}</p>
                                    <img class="rounded-lg drop-shadow-xl h-[50px] w-[50px] max-h-full max-w-full" src={item.image} alt="">
                                    <p class="font-bold">{item.name}</p>
                                </div>
                                <p>{item.artist}</p>
                            </a>
                        {/each}
                    </div>
                {:else}
                    <div class="flex flex-col gap-1 fade-bottom">
                        {#each tracksLifetime.slice(0, 5) as item, id}
                            <a href="/track/{item.id}" class="px-4 py-1 hover:-translate-y-1 hover:bg-base-200 transition-all flex justify-between items-center">
                                <div class="inline-flex items-center gap-6">
                                    <p class="font-black">#{id + 1}</p>
                                    <img class="rounded-lg drop-shadow-xl h-[50px] w-[50px] max-h-full max-w-full" src={item.image} alt="">
                                    <p class="font-bold">{item.name}</p>
                                </div>
                                <p>{item.artist}</p>
                            </a>
                        {/each}
                    </div>
                {/if}
                <div class="flex justify-center relative -top-4 opacity-50">
                    <a href="{$page.params.id}/top-tracks" class="hover:-translate-y-1 transition-all text-2xl font-bold">View all</a>
                </div>
            </div>
            <div class="top-artists mt-6">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-4xl inline-block font-black">Top artists</h2>
                    <div class="inline-block">
                        <button class="px-2 py-1 bg-stone-800 hover:bg-stone-900 transition-all rounded-tl-lg rounded-bl-lg" on:click={() => {
                            dateRangeArtists = "short_term";
                        }}>past 4 weeks</button>
                        <button class="px-2 py-1 bg-stone-800 hover:bg-stone-900 transition-all" on:click={() => {
                            dateRangeArtists = "medium_term";
                        }}>past 6 months</button>
                        <button class="px-2 py-1 bg-stone-800 hover:bg-stone-900 transition-all rounded-tr-lg rounded-br-lg" on:click={() => {
                            dateRangeArtists = "long_term";
                        }}>lifetime</button>
                    </div>
                </div>

                {#if dateRangeArtists === "short_term"}
                    <div class="flex flex-col gap-1 fade-bottom">
                        {#each artistsPastFourWeeks.slice(0, 5) as item, id}
                            <a href="/artist/{item.id}" class="px-4 py-1 hover:-translate-y-1 hover:bg-base-200 transition-all flex justify-between items-center">
                                <div class="inline-flex items-center gap-6">
                                    <p class="font-black">#{id + 1}</p>
                                    <img class="rounded-lg drop-shadow-xl h-[50px] w-[50px] max-h-full max-w-full" src={item.image} alt="">
                                    <p class="font-bold">{item.name}</p>
                                </div>
                            </a>
                        {/each}
                    </div>
                {:else if dateRangeArtists === "medium_term"}
                    <div class="flex flex-col gap-1 fade-bottom">
                        {#each artistsPastSixMonths.slice(0, 5) as item, id}
                            <a href="/artist/{item.id}" class="px-4 py-1 hover:-translate-y-1 hover:bg-base-200 transition-all flex justify-between items-center">
                                <div class="inline-flex items-center gap-6">
                                    <p class="font-black">#{id + 1}</p>
                                    <img class="rounded-lg drop-shadow-xl h-[50px] w-[50px] max-h-full max-w-full" src={item.image} alt="">
                                    <p class="font-bold">{item.name}</p>
                                </div>
                            </a>
                        {/each}
                    </div>
                {:else}
                    <div class="flex flex-col gap-1 fade-bottom">
                        {#each artistsLifetime.slice(0, 5) as item, id}
                            <a href="/artist/{item.id}" class="px-4 py-1 hover:-translate-y-1 hover:bg-base-200 transition-all flex justify-between items-center">
                                <div class="inline-flex items-center gap-6">
                                    <p class="font-black">#{id + 1}</p>
                                    <img class="rounded-lg drop-shadow-xl h-[50px] w-[50px] max-h-full max-w-full" src={item.image} alt="">
                                    <p class="font-bold">{item.name}</p>
                                </div>
                            </a>
                        {/each}
                    </div>
                {/if}

                <div class="flex justify-center relative -top-4 opacity-50">
                    <a href="{$page.params.id}/top-artists" class="hover:-translate-y-1 transition-all text-2xl font-bold">View all</a>
                </div>
            </div>
            <div class="top-genres mt-6">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-4xl inline-block font-black">Top genres</h2>
                    <div class="inline-block">
                        <button class="px-2 py-1 bg-stone-800 hover:bg-stone-900 transition-all rounded-tl-lg rounded-bl-lg" on:click={() => {
                            if (chartLoaded) {
                                options["series"] = genresWeeksData;
                                options["labels"] = genresWeeksLabels;
                            }
                        }}>past 4 weeks</button>
                        <button class="px-2 py-1 bg-stone-800 hover:bg-stone-900 transition-all" on:click={() => {
                            if (chartLoaded) {
                                options["series"] = genresMonthsData;
                                options["labels"] = genresMonthsLabels;
                            }                        
                        }}>past 6 months</button>
                        <button class="px-2 py-1 bg-stone-800 hover:bg-stone-900 transition-all rounded-tr-lg rounded-br-lg" on:click={() => {
                            if (chartLoaded) {
                                options["series"] = genresLifetimeData;
                                options["labels"] = genresLifetimeLabels;
                            }
                        }}>lifetime</button>
                    </div>
                </div>
                {#if chartLoaded}
                    <div class="h-[85%] w-[85%] text-center hover:-translate-y-1 transition-all px-4 graph mt-6">
                        <div class="" use:chartMethod={options}></div>
                    </div>
                {/if}    
            </div>
            <div class="lists">
                <h2 class="text-4xl inline-block font-black">Latest lists</h2>
                <div class="content mt-4 grid grid-flow-row-dense grid-cols-2 gap-4">
                    {#each usersLists as list}
                        <List href="/user/{$page.params.id}/lists/{list.id}" name={list.name} images={list.fiveImages}/>
                    {/each}
                    {#if usersLists.length === 0}
                        <p>No lists found.</p>
                    {/if}
                </div>
            </div>
            <div class="recent-reviews mt-6">
                <h2 class="text-4xl font-black mb-4">Latest reviews</h2>
            </div>
            <div class="likes">

            </div>
            <div class="tags">

            </div>
        </div>
    </div>
</div>

<style>
    .fade-bottom {
        mask-image: linear-gradient(
            black 80%,
            transparent 100%);
        -webkit-mask-image: linear-gradient(
            black 80%,
            transparent 100%);
    }
</style>