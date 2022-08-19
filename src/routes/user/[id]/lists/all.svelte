<script context="module">
    import { db, auth } from "../../../../firebase.js";
    import { collection, orderBy, query, getDocs, limit, startAfter, getDoc, doc } from "firebase/firestore";

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
        const userDataDoc = await getDoc(doc(db, `users/${params.id}`));
        if (userDataDoc.exists()) {
            userData = userDataDoc.data();
        } else {
            throw new Error("User does not exist");
        }

        return "Completed";
    }
</script>

<script>
	import SEO from './../../../../components/utilities/SEO.svelte';
	import List from './../../../../components/static/List.svelte';
	import { page } from '$app/stores';
    import { onMount } from 'svelte';

    let tracks = [];
    export let userData = {};

    let lastVisible;
    let currentListSize;

    onMount(() => {
        loginToFirebaseClientside();

        window.onscroll = function (event) {
            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight && currentListSize >= 6) {
                paginateData();
            }
        }
    });

    async function paginateData() {
        if (lastVisible || currentListSize < 6) {
            const allLabelsRef = collection(db, `users/${$page.params.id}/lists`);
            const allLabelsQuery = query(allLabelsRef, orderBy("lastModified", "asc"), startAfter(lastVisible), limit(8));
            const allLabels = await getDocs(allLabelsQuery);

            lastVisible = allLabels.docs[allLabels.docs.length - 1];
            currentListSize = allLabels.docs.length;

            allLabels.forEach((doc) => {
                addToTracks({
                    ...doc.data(),
                    fiveImages: generateFiveImages(doc.data().tracks),
                });
            });
        }
    }

    function addToTracks(data) {
        tracks.push(data);
        tracks = tracks;
    }

    async function loginToFirebaseClientside() {
        const allLabelsRef = collection(db, `users/${$page.params.id}/lists`);
        const allLabelsQuery = query(allLabelsRef, orderBy("lastModified", "asc"), limit(16));
        const allLabels = await getDocs(allLabelsQuery);

        lastVisible = allLabels.docs[allLabels.docs.length - 1];
        currentListSize = allLabels.docs.length;

        allLabels.forEach((doc) => {
            addToTracks({
                ...doc.data(),
                fiveImages: generateFiveImages(doc.data().tracks),
            });
        });
    }

    function generateFiveImages(images) {
        let fiveImages = [];
        if (images.length < 5) {
            for (const track of images) {
                fiveImages.push(track.image);
                fiveImages = fiveImages;
            }
        } else {
            for (const track of images.slice(0, 5)) {
                fiveImages.push(track.image);
                fiveImages = fiveImages;
            }
        }
        return fiveImages;
    }
</script>

<SEO height=460 width=460 title="{userData?.displayName} - Lists - Users - Radiowave for Spotify" description="View all of the lists created by {userData?.data?.displayName}, alongside their Spotify stats like recently played, top artists & tracks, and their latest reviews on Radiowave for Spotify." image="{userData?.data?.photoURL}"/>

<div class="mx-6 content">
    <div class="mt-2 text-sm breadcrumbs">
        <ul>
            <li><a href="/user/all">Users</a></li>
            <li><a href="/user/{$page.params.id}">{userData?.displayName}</a></li>
            <li>Lists</li>
            <li><a href="/user/{$page.params.id}/lists/all">All</a></li>
        </ul>
    </div>

    <h1 class="text-4xl font-black inline-block">All lists created by {userData?.displayName}</h1>
    <div class="grid grid-flow-row-dense justify-items-center grid-cols-4 gap-4 mt-6
    ">
        {#each tracks as item}
            <List images={item.fiveImages} name="{item.name}" href="/user/{item.userId}/lists/{item.id}"/>
        {/each}
    </div>
</div>

<style>

</style>