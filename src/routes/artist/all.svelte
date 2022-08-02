<script>
	import { goto } from '$app/navigation';
	import { browser } from '$app/env';
	import ProfileThumbnail from './../../components/thumbnails/ProfileThumbnail.svelte';
    import { collection, orderBy, query, getDocs, limit, startAfter } from "firebase/firestore";
    import { db, auth } from "../../firebase";
    import { onMount } from 'svelte';
import { get } from 'svelte/store';
import { session } from '$app/stores';

    let autocompleteResults = [];
    const characterRegex = /^([a-zA-Z0-9\s_-]+)$/
    let searchQuery = "";

    let tracks = [];

    let lastVisible;
    let currentLabelSize;

    const {userAgent} = get(session);

    onMount(() => {
        loginToFirebase();

        window.onscroll = function (event) {
            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight && currentLabelSize >= 6) {
                paginateData();
            }
        }
    });

    async function paginateData() {
        if (lastVisible || currentLabelSize < 6) {
            const allLabelsRef = collection(db, `artists`);
            const allLabelsQuery = query(allLabelsRef, orderBy("name", "asc"), startAfter(lastVisible), limit(6));
            const allLabels = await getDocs(allLabelsQuery);

            lastVisible = allLabels.docs[allLabels.docs.length - 1];
            currentLabelSize = allLabels.docs.length;

            allLabels.forEach((doc) => {
                addToTracks({
                    name: doc.data().name.toLowerCase(),
                    displayName: doc.data().name,
                    id: doc.data().id,
                    src: doc.data().images[1].url,
                });
            });
        }
    }

    function addToTracks(data) {
        tracks.push(data);
        tracks = tracks;
    }

    async function loginToFirebase() {
        const allLabelsRef = collection(db, `artists`);
        const allLabelsQuery = query(allLabelsRef, orderBy("name", "asc"), limit(19));
        const allLabels = await getDocs(allLabelsQuery);

        lastVisible = allLabels.docs[allLabels.docs.length - 1];
        currentLabelSize = allLabels.docs.length;

        allLabels.forEach((doc) => {
            addToTracks({
                name: doc.data().name.toLowerCase(),
                displayName: doc.data().name,
                id: doc.data().id,
                src: doc.data().images[1].url,
            });
        });
    }
</script>

<div class="mx-6 content">
    <div class="mt-2 text-sm breadcrumbs">
        <ul>
            <li><a href="/artist/all">Artists</a></li>
            <li>All</li>
        </ul>
    </div>

    <div class="my-6 flex justify-between">
        <h2 class="text-4xl font-black inline-block">
            {#if autocompleteResults.length === 0}
                All artists
            {:else}
                Searching all artists for {searchQuery}
            {/if}
        </h2>
    
        <span class="inline-flex justify-self-end self-center">
            <input on:keypress={(evt) => {
                if (!characterRegex.test(evt.key)) {
                    evt.preventDefault();
                }
            }} on:keydown={() => {
                if (!searchQuery || searchQuery === "" || searchQuery.trim() === "") {
                    autocompleteResults = [];
                }
            }} on:keyup={async (evt) => {
                if (searchQuery || searchQuery !== "" || searchQuery.trim() !== "") {
                    const labelRef = collection(db, `artists`);
                    const labelQuery = query(labelRef, orderBy(`searchableIndex.${searchQuery.toLowerCase()}`), limit(5));
                    const labels = await getDocs(labelQuery);
                    let temp = [];
            
                    labels.forEach(doc => {
                        temp.push({
                            name: doc.data().name.toLowerCase(),
                            displayName: doc.data().name,
                            id: doc.data().id,
                            src: doc.data().images[1].url,
                        });
                        temp = temp;
            
                        if (searchQuery || searchQuery !== "" || searchQuery.trim() !== "") {
                            autocompleteResults = temp;
                        }
                    });
                } else {
                    autocompleteResults = [];
                }
            }} bind:value={searchQuery} class="pl-1 bg-transparent text-white italic" placeholder="search..." type="text">
        </span>    
    </div>

    <div class="grid grid-flow-row-dense justify-items-center grid-cols-6 gap-4">
        {#if autocompleteResults.length !== 0}
            {#each autocompleteResults as item}
                <ProfileThumbnail src={item.src} alt="Profile picture of artist {item.displayName}" text={item.displayName} href="/artist/{item.id}"/>
            {/each}
        {:else}
            {#each tracks as item}
                <ProfileThumbnail src={item.src} alt="Profile picture of artist {item.displayName}" text={item.displayName} href="/artist/{item.id}"/>
            {/each}
        {/if}
    </div>
</div>

<style>

</style>