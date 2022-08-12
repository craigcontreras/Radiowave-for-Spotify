<script context="module">
	import SEO from './../../../../components/utilities/SEO.svelte';
    import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
    import { db, auth } from "../../../../firebase.js";

    let userLoaded = false;
    let invalidUser = true;
    let isOwner = false;
    let userData = {};
    let listData = {};
    let fiveImages = [];

    export async function load({params}) {
        await loginToFirebase(params);
        return {
            props: {
                invalidUser,
                isOwner,
                userData,
                listData,
                fiveImages,
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
        const userDoc = await getDoc(doc(db, `users/${params.id}`));
        if (!userDoc.exists()) {
            throw new Error("User does not exist");
        }
        userData = userDoc.data();

        const listDoc = await getDoc(doc(db, `users/${params.id}/lists/${params.listId}`));
        if (!listDoc.exists()) {
            throw new Error("List does not exist");
        }
        listData = listDoc.data();

        if (listData.tracks.length < 5) {
            for (const track of listData.tracks) {
                fiveImages.push(track.image);
                fiveImages = fiveImages;
            }
        } else {
            for (const track of listData.tracks.slice(0, 5)) {
                fiveImages.push(track.image);
                fiveImages = fiveImages;
            }
        }

        const user = await getCurrentUser();
        if (user !== null) {
            invalidUser = false;
            if (user.uid === listDoc.data().userId) {
                isOwner = true;
            }
        }

        return "Completed";
    }
</script>

<script>
    import { page } from "$app/stores";
	import Comments from '../../../../components/interactive/Comments.svelte';
    import { v4 as uuidv4 } from "uuid";
    import TrackThumbnail from "../../../../components/thumbnails/TrackThumbnail.svelte";
    import { faHeart } from "@fortawesome/free-solid-svg-icons/faHeart";
    import Icon from "svelte-awesome";
    import Likes from "../../../../components/interactive/Likes.svelte";
    import { onMount } from "svelte";
    import { browser } from "$app/env";

    export let invalidUser = true;
    export let isOwner = false;
    export let userData = {};
    export let listData = {};
    export let fiveImages = [];
    
    let inChangeMode = false;
    let newName;
    let newDescription;
    $: pages = paginate(listData?.tracks, 18);
    $: currentPage = 0;
    $: range = pageRange(currentPage, pages.length);
    $: paginationNumbers = generatePageRange(range.start, range.end);

    onMount(() => {
        newName = listData?.name;
        newDescription = listData?.description || "No description provided.";
    })

    async function submitChanges() {
        if (newName.length === 0) {
            return;
        }
        await setDoc(doc(db, `users/${$page.params.id}/lists/${$page.params.listId}`), {
            name: newName,
            description: newDescription,
            lastModified: serverTimestamp(),
        }, { merge: true });

        if (browser) {
            location.reload();
        }
    }

    function paginate(arr, size) {
        return arr.reduce((acc, val, i) => {
            let idx = Math.floor(i / size);
            let page = acc[idx] || (acc[idx] = []);
            page.push(val);

            return acc;
        }, []);
    }

    function pageRange(page, pageCount) {
        let start = page - 2, end = page + 2;
        if (end > pageCount) {
            start -= (end - pageCount);
            end = pageCount;
        }

        if (start <= 0) {
            end += ((start - 1) * (-1));
            start = 1;
        }

        end = end > pageCount ? pageCount : end;

        console.log({start, end});

        return { start, end };
    }

    function generatePageRange(start, end) {
        let arr = [];
        for (let i = start; i <= end; i++) {
            arr.push(i);
            arr = arr;
        }

        return arr;
    }
</script>

<SEO height=460 width=460 title="{listData?.name} by {userData?.displayName} - Playlist - Radiowave for Spotify" description="View {userData?.displayName}'s {listData?.name} playlist, their top artists & tracks, and their latest reviews on Radiowave for Spotify." image="{userData?.photoURL}"/>

<div class="mx-6 page">
    <div class="mt-2 text-sm breadcrumbs">
        <ul>
            <li><a href="/user/all">Users</a></li>
            <li><a href="/user/{$page.params.id}">{userData?.displayName}</a></li>
            <li>Lists</li>
            <li><a href="/user/{$page.params.id}/lists/{$page.params.listId}">{listData?.name}</a></li>
        </ul>
    </div>

    <div class="mt-6 content">
        <p class="text-xs mb-2 opacity-50">Last updated on {listData?.lastModified.toDate()}</p>
        <div class="header">
            {#if inChangeMode}
                <div on:keypress={(evt) => {
                    if (newName.length >= 50) {
                        evt.preventDefault();
                        return;
                    }
                }} class="bg-base-300 rounded-lg inline-block max-w-full w-max text-6xl break-words font-black" bind:textContent={newName} contenteditable=true></div><span class="inline-block opacity-50 text-xs ml-1 italic">({newName.length}/50)</span>
            {:else}
                <h1 class="mb-2 text-6xl break-words font-black">{listData?.name}</h1>
            {/if}
        </div>
        <div class="description mt-2 mb-4">
            {#if inChangeMode}
                <div on:keypress={(evt) => {
                    if (newDescription.length >= 99) {
                        evt.preventDefault();
                        return;
                    }
                }} class="bg-base-300 rounded-lg max-w-full w-max inline-block text-sm break-words" bind:textContent={newDescription} contenteditable=true></div><span class="inline-block opacity-50 text-xs ml-1 italic">({newDescription.length}/99)</span>
            {:else}
                {#if listData?.description}
                    <p class="text-sm break-words">{listData?.description}</p>
                {:else}
                    <p class="text-sm break-words italic opacity-50">No description provided.</p>
                {/if}
            {/if}
        </div>
        {#if inChangeMode}
            <button on:click={submitChanges} class="mb-4 py-1 px-2 rounded-lg bg-stone-900">Submit</button>
        {/if}
        <div class="created-by">
            <a class="align-middle inline-block" href="/user/{$page.params.id}">
                <div class="user-pfp transition-all hover:-translate-y-1">
                    <img class="inline-block align-middle h-[40px] rounded-full drop-shadow-xl" src="{userData?.photoURL}" alt="Profile picture of user {userData?.displayName}">
                    <p class="inline-block align-middle text-sm ml-1">Created by {userData?.displayName}</p>
                </div>
            </a>
            {#if !invalidUser}
                <div class="like-button transition-all hover:-translate-y-1 align-middle inline-block ml-10">
                    <Likes name="{listData?.name}" artist="{$page.params.id}" image={fiveImages} href="/user/{$page.params.id}/lists/{$page.params.listId}" textSize="text-sm" fromDoc="users/{$page.params.id}/lists/{$page.params.listId}" list={true} trackId="{$page.params.listId}" trackReview={false} placement="right"/>
                </div>
            {/if}
            {#if isOwner}
                <div class="change float-right inline-block align-middle">
                    <button on:click={() => {
                        inChangeMode = !inChangeMode;
                    }}>Change</button>
                </div>
            {/if}
        </div>
        {#if listData?.tracks?.length !== 0}
            <div class="tracks mt-6 grid grid-flow-row-dense grid-cols-6 gap-4">
                {#each pages[currentPage] as track}
                    <TrackThumbnail href="/{track.type}/{track.id}" artist="{track.artist}" title="{track.name}" src="{track.image}" alt="Cover of {track.name} by {track.artist}" classes=""/>
                {/each}
            </div>
            <div class="button-group mt-4 text-center">
                {#each paginationNumbers as page}
                    <button class="first:rounded-tl-lg first:rounded-bl-lg last:rounded-tr-lg last:rounded-br-lg hover:bg-black hover:scale-110 transition-all btn btn-md bg-black" on:click={() => {
                        currentPage = page - 1;
                    }}>{page}</button>
                {/each}
            </div>
        {:else}
            <p class="mt-6">No tracks found.</p>
        {/if}
        <div class="divider"></div>
        <div class="shoutbox">
            <h2 class="text-4xl mb-4 font-black">Shoutbox</h2>
            <Comments fromCollection={`users/${$page.params.id}/lists/${$page.params.listId}/comments`} fromDoc={`users/${$page.params.id}/lists/${$page.params.listId}/comments/${uuidv4()}`}/>
        </div>
    </div>
</div>


<style>
    
</style>