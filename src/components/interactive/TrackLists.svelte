<script>
    import { onMount } from "svelte";
    import Icon from "svelte-awesome";
    import faPlus from "@fortawesome/free-solid-svg-icons/faPlus";
    import { v4 as uuidv4 } from "uuid";
    import { db, auth } from "../../firebase.js";
    import { collection, doc, getDocs, setDoc } from "firebase/firestore";

    let userLoaded = false;
    let invalidUser = true;
    let createListName = "";
    let userId = "";
    let usersLists = [];

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
            getUsersLists();
        }
    }
    
    async function getUsersLists() {
        const lists = await getDocs(collection(db, `users/${userId}/lists`));
        lists.forEach(doc => {
            usersLists.push(doc.data());
            usersLists = usersLists;
        });
    }

    async function addToList() {

    }

    async function removeFromList() {

    }

    async function createList(name) {
        const generatedUUID = uuidv4();

        const data = {
            name,
            userId,
            id: generatedUUID,
            tracks: {},
            albums: {},
        }

        await setDoc(doc(db, `users/${userId}/lists/${generatedUUID}`), data, {
            merge: true,
        });

        usersLists.push(data);
        usersLists = usersLists;
    }

    async function deleteList() {
        
    }
</script>

{#if !invalidUser}
    <div class="list-content rounded-lg bg-stone-900 drop-shadow-xl">
        <form action="" on:submit|preventDefault={() => {
            createList(createListName);
        }}>
            <Icon class="inline-block align-middle" data={faPlus}/><input class="inline-block align-middle ml-1" placeholder="Create a list..." type="text" bind:value={createListName}>
        </form>
        <ul class="lists">
            {#each usersLists as list}
                <li></li>
            {/each}
        </ul>
    </div>
{/if}

<style>
    
</style>