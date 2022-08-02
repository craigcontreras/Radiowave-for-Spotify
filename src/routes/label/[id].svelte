<script context="module">
    import { auth, db } from "../../firebase.js";
    import { collection, doc, getDoc, getDocs, increment, limit, orderBy, query, setDoc, startAfter, where } from "firebase/firestore";

    let userLoaded = false;
    let labelData;
    let invalidUser = true;

    export async function load({params}) {
        await loginToFirebase(params);
        return {
            props: {
                userLoaded,
                labelData,
                invalidUser,
            }
        }
    }

    async function loginToFirebase(params) {
        const user = await getCurrentUser();
        if (user !== null) {
            invalidUser = false;
        }

        const labelDataDocument = await getDoc(doc(db, `labels/${params.id}`));
        if (labelDataDocument.exists()) {
            labelData = labelDataDocument.data();
            return "Completed";
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
	import UploadFile from './../../components/UploadFile.svelte';
	import Modal from './../../components/Modal.svelte';
	import Icon from 'svelte-awesome';
    import { faYoutube } from '@fortawesome/free-brands-svg-icons/faYoutube';
    import { faTwitter } from '@fortawesome/free-brands-svg-icons/faTwitter';
    import { faInstagram } from '@fortawesome/free-brands-svg-icons/faInstagram';
    import { faFacebook } from '@fortawesome/free-brands-svg-icons/faFacebook';
    import { faGlobe } from '@fortawesome/free-solid-svg-icons/faGlobe';
    import { faPencil } from '@fortawesome/free-solid-svg-icons/faPencil';
    import { slide } from "svelte/transition";
	import { page, session } from '$app/stores';
    import { browser } from "$app/env";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import DOMPurify from "isomorphic-dompurify";
    import { get } from 'svelte/store';

    let editBiography = "";
    $: sanitizedBiography = DOMPurify.sanitize(editBiography, {ALLOWED_TAGS: [], ALLOWED_ATTR: []});
    export let invalidUser;
    export let labelData = {};
    let changeMode = false;
    let biographyCollapsed = false;
    let hideModal = true;
    let photoHref = "https://firebasestorage.googleapis.com/v0/b/radiowavemusic.appspot.com/o/images%2Fno%20photo%20found.jpg?alt=media&token=678e386f-707c-4ca7-881b-4fbe90db8ca7";

    let twitterLink = "";
    let instagramLink = "";
    let youtubeLink = "";
    let facebookLink = "";
    let websiteLink = "";

    let lastVisible;
    let currentLabelSize;

    let tracks = [];

    let sortBy = "release_date";
    let ascOrDesc = "desc";
    let label = "Newest";
    let category = "release date"
    let type = "albums"

    const {userAgent} = get(session);

    onMount(() => {
        loginToFirebase();

        window.onscroll = function (event) {
            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight && currentLabelSize >= 3) {
                paginateData();
            }
        }
    })

    async function loginToFirebase() {
        if (labelData?.photoHref) {
            photoHref = labelData?.photoHref;
        }
        editBiography = labelData?.biography;
        websiteLink = labelData?.websiteHref;
        youtubeLink = labelData?.youtubeHref;
        twitterLink = labelData?.twitterHref;
        instagramLink = labelData?.instagramHref;
        facebookLink = labelData?.facebookHref;

        const allTracksRef = collection(db, type);
        const allTracksQuery = query(allTracksRef, where("labelNames", "array-contains-any", [labelData?.name]), orderBy(sortBy, ascOrDesc), limit(9));
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
            const allTracksQuery = query(allTracksRef, where("labelNames", "array-contains-any", [labelData?.name]), orderBy(sortBy, ascOrDesc), startAfter(lastVisible), limit(3));
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
        const allTracksQuery = query(allTracksRef, where("labelNames", "array-contains-any", [labelData?.name]), orderBy(sortBy, ascOrDesc), limit(9));
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

<Modal header="Upload image" bind:hideModal={hideModal}><svelte:fragment slot="body">
    <UploadFile bind:hideModal={hideModal} on:completedupload={(event) => {
        photoHref = event.detail.href;
    }} documentPath="labels/{$page.params.id}"/>
</svelte:fragment></Modal>

<div class="page mx-6">
    <div class="mt-2 text-sm breadcrumbs">
        <ul>
            <li><a href="/label/all">Labels</a></li>
            <li>{labelData?.name}</li>
        </ul>
    </div>
    
    <div class="flex justify-between mt-6">
        <div class="header sticky top-6 h-full basis-1/5 flex flex-col justify-center items-center">
            <span class="max-w-[10rem]">
                <span>
                    <img on:click={() => {
                        if (changeMode) { hideModal = !hideModal }
                    }} class:cursor-pointer={changeMode} class="rounded-full drop-shadow-xl hover:-translate-y-1 transition-all h-40 w-40 min-h-[10rem] min-w-[10rem]" src={photoHref} alt="">
                    <span class:hidden={!changeMode} class="transition-all hover:scale-125 absolute top-0 px-2 py-1 cursor-pointer rounded-full drop-shadow-xl bg-stone-800" on:click={() => {
                        if (changeMode) { hideModal = !hideModal }
                    }}><Icon data={faPencil}/></span>
                </span>
                <h2 class="text-2xl break-words text-center font-black mt-4">{labelData?.name}</h2>
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
                                await setDoc(doc(db, `labels/${$page.params.id}`), {
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
                        await setDoc(doc(db, `labels/${$page.params.id}`), {
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

            {#if !changeMode && (labelData?.twitterHref?.trim() !== "" || labelData?.instagramHref?.trim() !== "" || labelData?.facebookHref?.trim() !== "" || labelData?.youtubeHref?.trim() !== "" || labelData?.websiteHref?.trim() !== "")}
                <div class="socials mt-6 text-xs w-3/4 flex justify-evenly drop-shadow-lg">
                    {#if labelData?.twitterHref}
                        <a class="transition-all hover:-translate-y-[0.10rem]" href="{labelData?.twitterHref}"><Icon data={faTwitter}/></a>
                    {/if}
                    {#if labelData?.instagramHref}
                        <a class="transition-all hover:-translate-y-[0.10rem]" href="{labelData?.instagramHref}"><Icon data={faInstagram}/></a>
                    {/if}
                    {#if labelData?.facebookHref}
                        <a class="transition-all hover:-translate-y-[0.10rem]" href="{labelData?.facebookHref}"><Icon data={faFacebook}/></a>
                    {/if}
                    {#if labelData?.youtubeHref}
                        <a class="transition-all hover:-translate-y-[0.10rem]1" href="{labelData?.youtubeHref}"><Icon data={faYoutube}/></a>
                    {/if}
                    {#if labelData?.websiteHref}
                        <a class="transition-all hover:-translate-y-[0.10rem]" href="{labelData?.websiteHref}"><Icon data={faGlobe}/></a>
                    {/if}
                </div>
            {/if}
            
            {#if !invalidUser}
                <button class="text-xs my-6 opacity-10 transition-all hover:opacity-100 self-start" on:click={enterChangeMode}>Change</button>
            {/if}
        </div>
        <div class="content basis-4/5 pr-14">
            <div class="flex justify-between">
                <h2 class="text-4xl font-black mb-4 max-w-[50%]">Music released by {labelData?.name}</h2>
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