<script context="module">
	import SEO from './../../../components/utilities/SEO.svelte';
    import { doc, getDoc } from "firebase/firestore";
    import { db } from "../../../firebase.js";
    
    let userData;

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
            userData = {
                data: userDataDocument.data(),
                id: userDataDocument.id,
            };
        } else {
            throw new Error("User does not exist");
        }
        return "Completed";
    }
</script>

<script>
	import { page } from '$app/stores';
    import { onMount } from "svelte";
    import Pusher from "pusher-js";

    export let userData = {};
    let recentPlays = [];

    const pusher = new Pusher("5e07f212c04ae7ccbb27", {
        cluster: "us2"
    });

    onMount(() => {
        const channel = pusher.subscribe("cache-recently-played");
        channel.bind($page.params.id, data => {
            recentPlays = data.data || [];
        });

        channel.bind("pusher:cache_miss", data => {
            recentPlays = data.data || [];
        });
    })
</script>

<SEO height=460 width=460 title="{userData?.data?.displayName} - Recent Plays - Users - Radiowave for Spotify" description="View {userData?.data?.displayName}'s Spotify stats like recently played, top artists & tracks, and their latest reviews on Radiowave for Spotify." image="{userData?.data?.photoURL}"/>

<div class="mx-6">
    <div class="my-2 text-sm breadcrumbs">
        <ul>
            <li><a href="/user/all">Users</a></li>
            <li><a href="/user/{userData?.id}">{userData?.data?.displayName}</a></li>
            <li>Recent plays</li>
        </ul>
    </div>
    <a href="/user/{$page.params.id}">
        <img class="h-[48px] w-[48px] max-h-full max-w-full transition-all hover:-translate-y-1 inline-block align-middle rounded-full outline-4 drop-shadow-xl" src={userData?.data?.photoURL} alt="Profile picture of {userData?.data?.displayName}">
    </a>
    <div id="account-details" class="transition-all hover:-translate-y-1 ml-1 mr-2 leading-4 align-middle inline-block">
        <a href="/user/{$page.params.id}">
            <h1 class="text-lg font-black ml-2">{userData?.data?.displayName}</h1> 
        </a>
    </div>
    <div class="divider"></div>
    <div class="flex flex-col gap-1 recent-plays">
        <h2 class="text-4xl font-black mb-4">Recent plays <span class="text-xs font-normal opacity-50">updates every 40 minutes</span></h2>
        {#if recentPlays.length !== 0}
            {#each recentPlays as item}
                <a href="/track/{item.id}" class="px-4 py-1 hover:-translate-y-1 hover:bg-base-200 transition-all flex justify-between items-center">
                    <div class="inline-flex items-center gap-6">
                        <img class="rounded-lg drop-shadow-xl h-[50px] w-[50px] max-h-full max-w-full" src={item.image} alt="">
                        <p class="font-bold">{item.name}</p>
                        <p class="text-xs">{new Date(item.played_at).getFullYear()}-{new Date(item.played_at).getMonth() + 1}-{new Date(item.played_at).getDate()} @ {new Date(item.played_at).getHours()}:{new Date(item.played_at).getMinutes()}</p> 
                    </div>
                    <p>{item.artist}</p>
                </a>
            {/each}
        {:else}
            <p>Recent plays could not be loaded because of an error.</p>
        {/if}
    </div>
</div>

<style>

</style>