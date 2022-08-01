<script>
    //implement latest plays component later
	import { browser } from '$app/env';
    import { db, auth } from '../firebase';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
import { get } from 'svelte/store';
import { session } from '$app/stores';

    let userInfo = {};
    let userLoaded = false;
    let userId = ""; //used for latest plays component

    const {userAgent} = get(session);

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
        const user = await getCurrentUser(auth);
        if (user !== null) {
            userInfo = user;
        } else {
            if (!userAgent.includes("prerender Prerender (+https://github.com/prerender/prerender)") && browser) {
                // goto("/error");
            }
        }
    }
    
    //on component load, log into firebase
    onMount(() => {
        loginToFirebase();
    })
</script>

{#if userLoaded}
    <p>Signed in as {userInfo.displayName}</p>
    
    <p>{JSON.stringify(userInfo)}</p>

    <h2>Latest plays</h2>
{:else}
    <p>Not signed in</p>
{/if}

<style>
</style>
