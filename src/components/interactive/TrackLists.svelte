<script>
	import { slide } from 'svelte/transition';
    import { onMount } from "svelte";
    import { v4 as uuidv4 } from "uuid";
    import { db, auth } from "../../firebase.js";
    import { collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
    import find from "lodash/find.js";
    import remove from "lodash/remove.js";
    import Icon from "svelte-awesome";
    import { faClose } from '@fortawesome/free-solid-svg-icons/faClose';

    export let trackId;
    export let trackType;
    export let trackName;
    export let trackArtist;
    export let trackImage;
    export let hide;
    export let classes;

    let userLoaded = false;
    let invalidUser = true;
    let createListName = "";
    let userId = "";
    let userPicture = "";
    let displayName = "";
    let usersLists = {};
    let checked = {};

    onMount(() => {
        loginToFirebase();
    })

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
        })
    }

    async function loginToFirebase() {
        const user = await getCurrentUser();
        if (user !== null) {
            invalidUser = false;
            userId = user.uid;
            userPicture = user.photoURL;
            displayName = user.displayName;
            getUsersLists();
        }
    }
    
    async function getUsersLists() {
        const listQuery = query(collection(db, `users/${userId}/lists`), orderBy("lastModified", "desc"));
        const lists = await getDocs(listQuery);
        lists.forEach(doc => {
            usersLists[doc.data().id] = doc.data();
            checked[doc.data().id] = findInList(doc.data().id);
        });
    }

    async function addToList(id) {
        usersLists[id].tracks.push({
            id: trackId,
            name: trackName,
            artist: trackArtist,
            image: trackImage,
            type: trackType,
        });
        usersLists[id].tracks = usersLists[id].tracks;
        checked[id] = true;

        await setDoc(doc(db, `users/${userId}/lists/${id}`), {...usersLists[id], lastModified: serverTimestamp() }, {
            merge: true,
        });
    }

    async function removeFromList(id) {
        if (find(usersLists[id].tracks, {id: trackId})) {
            remove(usersLists[id].tracks, {id: trackId});
            delete checked[id];
            usersLists[id].tracks = usersLists[id].tracks;

            await setDoc(doc(db, `users/${userId}/lists/${id}`), {...usersLists[id], lastModified: serverTimestamp() }, {
                merge: true,
            });
        }
    }

    async function listCheck(id) {
        if (find(usersLists[id].tracks, {id: trackId})) {
            removeFromList(id);
        } else {
            addToList(id);
        }
    }

    function findInList(id) {
        if (find(usersLists[id].tracks, {id: trackId})) {
            return true;
        }
        return false;
    }

    async function createList(name) {
        if (!name || name.trim() === "" || name === "" || name === " " || name.replaceAll(" ", "") === "") return;

        const generatedUUID = uuidv4();

        const data = {
            name,
            displayName,
            userId,
            userPicture,
            id: generatedUUID,
            tracks: [],
        }

        await setDoc(doc(db, `users/${userId}/lists/${generatedUUID}`), {...data, lastModified: serverTimestamp() }, {
            merge: true,
        });

        usersLists[generatedUUID] = data;

        createListName = "";
    }

    async function deleteList(id) {
        if (usersLists.hasOwnProperty(id)) {
            delete usersLists[id];
            usersLists = usersLists;
            await deleteDoc(doc(db, `users/${userId}/lists/${id}`));
            await deleteDoc(doc(db, `list-statistics/${id}`))
        }
    }
</script>

{#if !invalidUser && !hide}
    <div class:hidden={hide} transition:slide class="{classes} absolute py-2 px-4 z-50 max-h-fit max-w-fit list-content rounded-lg bg-stone-900 drop-shadow-xl">
        <form action="" on:submit|preventDefault={() => {
            createList(createListName);
        }}>
            <input class="bg-transparent inline-block align-middle ml-1" placeholder="Create a list..." type="text" bind:value={createListName}>
        </form>

        <ul class="lists">
            {#each Object.entries(usersLists) as [key, value] (value.id)}
                <div>
                    <li class="inline-block align-middle form-control">
                        <input type="checkbox" 
                        bind:checked={checked[value.id]} on:click={() => {
                            listCheck(value.id);
                        }} class="inline mr-1">
                        {#if value.name.length >= 26}
                            {value.name.substring(0, 23)}...
                        {:else}
                            {value.name}
                        {/if}
                    </li>
                    <button class="ml-1 inline-block align-middle" on:click={() => {
                        deleteList(value.id);
                    }}><Icon data={faClose}/></button>
                </div>
            {/each}
        </ul>
    </div>
{/if}

<style>
    
</style>