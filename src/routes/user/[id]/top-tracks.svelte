<script context="module">
	import SEO from './../../../components/utilities/SEO.svelte';
    import { doc, getDoc } from 'firebase/firestore';
    import { db } from '../../../firebase.js';

    let userData = {};
    let tracksPastFourWeeks = [];
    let tracksPastSixMonths = [];
    let tracksLifetime = [];

    export async function load({params}) {
        await loginToFirebase(params);
        return {
            props: {
                userData,
                tracksPastFourWeeks,
                tracksPastSixMonths,
                tracksLifetime,
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
            tracksPastFourWeeks = userData?.data?.tracksPastFourWeeks;
            tracksPastSixMonths = userData?.data?.tracksPastSixMonths;
            tracksLifetime = userData?.data?.tracksPastLifetime;
        } else {
            throw new Error("User does not exist");
        }
        return "Completed";
    }
</script>

<script>
	import { page } from '$app/stores';

    let dateRange = "short_term";
    export let userData = {};
    export let tracksPastFourWeeks = [];
    export let tracksPastSixMonths = [];
    export let tracksLifetime = [];
</script>

<SEO height=460 width=460 title="{userData?.data?.displayName} - Recent Plays - Users - Radiowave for Spotify" description="View {userData?.data?.displayName}'s Spotify stats like recently played, top artists & tracks, and their latest reviews on Radiowave for Spotify." image="{userData?.data?.photoURL}"/>

<div class="page mx-6">
    <div class="my-2 text-sm breadcrumbs">
        <ul>
            <li><a href="/user/all">Users</a></li>
            <li><a href="/user/{userData?.id}">{userData?.data?.displayName}</a></li>
            <li>Top tracks</li>
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
    <div class="top-tracks">
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
            <div class="flex flex-col gap-1">
                {#each tracksPastFourWeeks as item, id}
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
            <div class="flex flex-col gap-1">
                {#each tracksPastSixMonths as item, id}
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
            <div class="flex flex-col gap-1">
                {#each tracksLifetime as item, id}
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
        {/if}
    </div>
</div>

<style>

</style>