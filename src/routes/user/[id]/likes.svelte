<script context="module">
	import SEO from './../../../components/utilities/SEO.svelte';
    import { doc, getDoc } from 'firebase/firestore';
    import { db } from '../../../firebase.js';

    let userData = {};

    export async function load({params}) {
        await loginToFirebase(params);
        return {
            props: {
                userData,
            }
        }
    }

    async function loginToFirebase(params) {
        const userDataDocument = await getDoc(doc(db, `users/${params.id}`));
        if (userDataDocument.exists()) {
            userData = userDataDocument.data();
        } else {
            throw new Error("User does not exist");
        }
        return "Completed";
    }
</script>

<script>
	import { page } from '$app/stores';
    import TrackThumbnail from '../../../components/thumbnails/TrackThumbnail.svelte';

    let likeType = "albums";
    export let userData = {};
</script>

<SEO height=460 width=460 title="{userData?.displayName} - Likes - Users - Radiowave for Spotify" description="View all tracks, albums liked by {userData?.displayName}, alongside their Spotify stats like recently played, top artists & tracks, and their latest reviews on Radiowave for Spotify." image="{userData?.photoURL}"/>

<div class="page mx-6">
    <div class="my-2 text-sm breadcrumbs">
        <ul>
            <li><a href="/user/all">Users</a></li>
            <li><a href="/user/{$page.params.id}">{userData?.displayName}</a></li>
            <li>All likes</li>
        </ul>
    </div>
    <a href="/user/{$page.params.id}">
        <img class="h-[48px] w-[48px] max-h-full max-w-full transition-all hover:-translate-y-1 inline-block align-middle rounded-full outline-4 drop-shadow-xl" src={userData?.photoURL} alt="Profile picture of {userData?.displayName}">
    </a>
    <div id="account-details" class="transition-all hover:-translate-y-1 ml-1 mr-2 leading-4 align-middle inline-block">
        <a href="/user/{$page.params.id}">
            <h1 class="text-lg font-black ml-2">{userData?.displayName}</h1> 
        </a>
    </div>
    <div class="divider"></div>
    <div class="all-likes">
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-4xl inline-block font-black">Latest likes</h2>
            <div class="inline-block">
                <button class="px-2 py-1 bg-stone-800 hover:bg-stone-900 transition-all rounded-tl-lg rounded-bl-lg" on:click={() => {
                    likeType = "tracks";
                }}>tracks</button>
                <button class="px-2 py-1 bg-stone-800 hover:bg-stone-900 transition-all rounded-tr-lg rounded-br-lg" on:click={() => {
                    likeType = "albums";                     
                }}>albums</button>
            </div>
        </div>

        {#if likeType === "albums"}
            <div class="grid grid-flow-row-dense grid-cols-6 gap-2">
                {#each Object.values(userData?.likedAlbums) as like}
                    <TrackThumbnail href="/track/{like.id}" src="{like.image}" alt="Album cover of {like.name} by {like.artist}" title="{like.name}" artist="{like.artist}" classes="" />
                {/each}
            </div>
        {:else}
            <div class="grid grid-flow-row-dense grid-cols-6 gap-2">
                {#each Object.values(userData?.likedTracks) as like}
                    <TrackThumbnail href="/track/{like.id}" src="{like.image}" alt="Album cover of {like.name} by {like.artist}" title="{like.name}" artist="{like.artist}" classes="" />
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>

</style>