<script context="module">
    import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, startAfter, where } from "firebase/firestore";
    import { auth, db } from "../../firebase.js";

    let userLoaded = false;
    let genreData;
    let invalidUser = true;

    export async function load({params}) {
        await loginToFirebase(params);
        return {
            props: {
                userLoaded,
                genreData,
                invalidUser,
            }
        }
    }

    async function loginToFirebase(params) {
        const user = await getCurrentUser();
        if (user !== null) {
            invalidUser = false;
        }

        const genreDataDocument = await getDoc(doc(db, `genres/${params.id}`));
        if (genreDataDocument.exists()) {
            genreData = genreDataDocument.data();
            return "Completed";
        } else {
            throw new Error("lol");
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
</script>

<script>
	import Dropdown from './../../components/Dropdown.svelte';
	import BigTrackThumbnail from './../../components/thumbnails/BigTrackThumbnail.svelte';
	import { marked } from 'marked';
    import { slide } from "svelte/transition";
	import { page } from '$app/stores';
    import { browser } from "$app/env";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import DOMPurify from "isomorphic-dompurify";
    import { get } from 'svelte/store';

    let editBiography = "";
    $: sanitizedBiography = DOMPurify.sanitize(editBiography, {ALLOWED_TAGS: [], ALLOWED_ATTR: []});
    export let genreData = {};
    export let invalidUser;
    let changeMode = false;
    let biographyCollapsed = false;
    
    let lastVisible;
    let currentLabelSize;

    let tracks = [];

    let sortBy = "release_date";
    let ascOrDesc = "desc";
    let label = "Newest";
    let category = "release date";
    let type = "albums";

    onMount(() => {
        loginToFirebase();

        window.onscroll = function (event) {
            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight && currentLabelSize >= 3) {
                paginateData();
            }
        }
    })

    async function loginToFirebase() {
        editBiography = genreData?.biography;

        const allTracksRef = collection(db, type);
        const allTracksQuery = query(allTracksRef, where("genreNames", "array-contains-any", [genreData?.name]), orderBy(sortBy, ascOrDesc), limit(9));
        const allTracks = await getDocs(allTracksQuery);

        lastVisible = allTracks.docs[allTracks.docs.length - 1];
        currentLabelSize = allTracks.docs.length;

        allTracks.forEach((doc) => {
            addToTracks({
                data: doc.data(),
                id: doc.id,
            });
        });
    }

    async function paginateData() {
        if (lastVisible || currentLabelSize < 3) {    
            const allTracksRef = collection(db, type);
            const allTracksQuery = query(allTracksRef, where("genreNames", "array-contains-any", [genreData?.name]), orderBy(sortBy, ascOrDesc), startAfter(lastVisible), limit(3));
            const allTracks = await getDocs(allTracksQuery);

            lastVisible = allTracks.docs[allTracks.docs.length - 1];
            currentLabelSize = allTracks.docs.length;

            allTracks.forEach((doc) => {
                addToTracks({
                    data: doc.data(),
                    id: doc.id,
                });
            });
        }
    }

    function addToTracks(data) {
        tracks.push(data);
        tracks = tracks;
    }

    function enterChangeMode() {
        changeMode = !changeMode;
        biographyCollapsed = true;
    }

    async function refreshQuery() {
        tracks = [];
        lastVisible = 0;
        currentLabelSize = 0;

        const allTracksRef = collection(db, type);
        const allTracksQuery = query(allTracksRef, where("genreNames", "array-contains-any", [genreData?.name]), orderBy(sortBy, ascOrDesc), limit(9));
        const allTracks = await getDocs(allTracksQuery);

        lastVisible = allTracks.docs[allTracks.docs.length - 1];
        currentLabelSize = allTracks.docs.length;

        allTracks.forEach((doc) => {
            addToTracks({
                data: doc.data(),
                id: doc.id,
            });
        });
    }
</script>

<div class="page mx-6">
    <div class="mt-2 text-sm breadcrumbs">
        <ul>
            <li><a href="/genre/all">Genres</a></li>
            <li>{genreData?.name}</li>
        </ul>
    </div>
    
    <div class="flex justify-between mt-6">
        <div class="header sticky top-6 h-full basis-1/5 flex flex-col justify-center items-center">
            <span class="max-w-[10rem]">
                <h2 class="text-2xl break-words text-center font-black mt-4">{genreData?.name}</h2>
            </span>
            <div class="history w-3/4 mt-4 text-xs transition-all hover:-translate-y-1 p-4 drop-shadow-xl rounded-lg bg-black">
                <h2 class="italic inline text-gray-400">HISTORY</h2>
                <button class="float-right inline" on:click={() => {
                    biographyCollapsed = !biographyCollapsed;
                }}>Collapse</button>
                
                {#if biographyCollapsed}
                    <div transition:slide>
                        <div id="divider" class="w-full bg-gray-700 h-0.5"></div>
                        {#if changeMode}
                            <form action="" on:submit|preventDefault={async () => {
                                await setDoc(doc(db, `genres/${$page.params.id}`), {
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
            {#if !invalidUser}
                <button class="text-xs my-6 opacity-10 transition-all hover:opacity-100 self-start" on:click={enterChangeMode}>Change</button>
            {/if}
        </div>
        <div class="content basis-4/5 pr-14">
            <div class="flex justify-between">
                <h2 class="text-4xl font-black mb-4 max-w-[50%]">Music labeled {genreData?.name?.toLowerCase()}</h2>
                <span>
                    <Dropdown classes="absolute" label="Sort by {category}" buttonContent={label}>
                        <ul slot="elements" class="text-xs">
                            <p class="m-0 p-1 bg-stone-800 italic rounded-bl-lg first:rounded-t-lg last:rounded-b-lg">Release date</p>
                            <li on:click={() => {
                                if (type === "tracks") {
                                    sortBy = "album.release_date"
                                } else {
                                    sortBy = "release_date"
                                }
                                ascOrDesc = "desc";
                                label = "Newest";
                                category = "release date";
                                refreshQuery();
                            }} class="cursor-pointer hover:bg-stone-900 m-0 p-1 ml-3 bg-stone-800 first:rounded-t-lg last:rounded-b-lg">Newest</li>
                            <li on:click={() => {
                                if (type === "tracks") {
                                    sortBy = "album.release_date"
                                } else {
                                    sortBy = "release_date"
                                }
                                ascOrDesc = "asc";
                                label = "Oldest";
                                category = "release date";
                                refreshQuery();
                            }} class="cursor-pointer hover:bg-stone-900 m-0 p-1 ml-3 bg-stone-800 first:rounded-t-lg last:rounded-b-lg">Oldest</li>
                            <p class="m-0 p-1 bg-stone-800 italic rounded-bl-lg rounded-tl-lg first:rounded-t-lg last:rounded-b-lg">Rating</p>
                            <li on:click={() => {
                                sortBy = "avgRating"
                                ascOrDesc = "desc";
                                label = "Highest";
                                category = "rating";
                                refreshQuery();
                            }} class="cursor-pointer hover:bg-stone-900 m-0 p-1 ml-3 bg-stone-800 first:rounded-t-lg last:rounded-b-lg">Highest</li>
                            <li on:click={() => {
                                sortBy = "avgRating"
                                ascOrDesc = "asc";
                                label = "Lowest";
                                category = "rating";
                                refreshQuery();
                            }} class="cursor-pointer hover:bg-stone-900 m-0 p-1 ml-3 bg-stone-800 first:rounded-t-lg last:rounded-b-lg">Lowest</li>
                            <p class="m-0 p-1 bg-stone-800 italic rounded-bl-lg rounded-tl-lg first:rounded-t-lg last:rounded-b-lg">Artist</p>
                            <li on:click={() => {
                                sortBy = "primary_artist"
                                ascOrDesc = "asc";
                                label = "A-Z";
                                category = "artist";
                                refreshQuery();
                            }} class="cursor-pointer hover:bg-stone-900 m-0 p-1 ml-3 bg-stone-800 first:rounded-t-lg last:rounded-b-lg">A-Z</li>
                            <li on:click={() => {
                                sortBy = "primary_artist"
                                ascOrDesc = "desc";
                                label = "Z-A";
                                category = "artist";
                                refreshQuery();
                            }} class="cursor-pointer hover:bg-stone-900 m-0 p-1 ml-3 bg-stone-800 first:rounded-t-lg last:rounded-b-lg">Z-A</li>
                            <p class="m-0 p-1 bg-stone-800 italic rounded-bl-lg rounded-tl-lg first:rounded-t-lg last:rounded-b-lg">Track name</p>
                            <li on:click={() => {
                                sortBy = "name"
                                ascOrDesc = "asc";
                                label = "A-Z";
                                category = "name";
                                refreshQuery();
                            }} class="cursor-pointer hover:bg-stone-900 m-0 p-1 ml-3 bg-stone-800 first:rounded-t-lg last:rounded-b-lg">A-Z</li>
                            <li on:click={() => {
                                sortBy = "name"
                                ascOrDesc = "desc";
                                label = "Z-A";
                                category = "name";
                                refreshQuery();
                            }} class="cursor-pointer hover:bg-stone-900 m-0 p-1 ml-3 bg-stone-800 first:rounded-t-lg last:rounded-b-lg">Z-A</li>
                            <p class="m-0 p-1 bg-stone-800 italic rounded-bl-lg rounded-tl-lg first:rounded-t-lg last:rounded-b-lg">Popularity</p>
                            <li on:click={() => {
                                sortBy = "numRatings"
                                ascOrDesc = "desc";
                                label = "Highest";
                                category = "popularity";
                                refreshQuery();
                            }} class="cursor-pointer hover:bg-stone-900 m-0 p-1 ml-3 bg-stone-800 first:rounded-t-lg last:rounded-b-lg">Highest</li>
                            <li on:click={() => {
                                sortBy = "numRatings"
                                ascOrDesc = "asc";
                                label = "Lowest";
                                category = "popularity";
                                refreshQuery();
                            }} class="cursor-pointer hover:bg-stone-900 m-0 p-1 ml-3 bg-stone-800 first:rounded-t-lg last:rounded-b-lg">Lowest</li>
                            <p class="m-0 p-1 bg-stone-800 italic rounded-bl-lg rounded-tl-lg first:rounded-t-lg last:rounded-b-lg">Album type</p>
                            <li on:click={() => {
                                if (sortBy === "release_date") {
                                    sortBy = "album.release_date";
                                }
                                type = "tracks";
                                refreshQuery();
                            }} class="cursor-pointer hover:bg-stone-900 m-0 p-1 ml-3 bg-stone-800 first:rounded-t-lg last:rounded-b-lg">Track</li>
                            <li on:click={() => {
                                if (sortBy === "album.release_date") {
                                    sortBy = "release_date";
                                }
                                type = "albums";
                                refreshQuery();
                            }} class="cursor-pointer hover:bg-stone-900 m-0 p-1 ml-3 bg-stone-800 first:rounded-t-lg last:rounded-b-lg">Album</li>
                        </ul>
                    </Dropdown>
                </span>
    
            </div>
            <div class="grid grid-cols-3 justify-center grid-flow-row-dense gap-4">
                {#if type === "tracks"}
                    {#if tracks.length === 0}
                        <p>No tracks found.</p>
                    {/if}
                    {#each tracks as track}
                        <BigTrackThumbnail date={track?.data?.album?.release_date} classes="" href="/track/{track.id}" src={track.data.album.images[1].url} alt="" title={track.data.name} artist={track.data.album.artists[0].name}/>
                    {/each}
                {:else}
                    {#if tracks.length === 0}
                        <p>No albums found.</p>
                    {/if}
                    {#each tracks as track}
                        <BigTrackThumbnail date={track?.data?.release_date} classes="" href="/album/{track.id}" src={track.data.images[1].url} alt="" title={track.data.name} artist={track.data.artists[0].name}/>
                    {/each}
                {/if}
            </div>
        </div>
    </div>
</div>

<style>
</style>