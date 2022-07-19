<script>
	import Navbar from './../components/Navbar.svelte';
    //implement latest plays component later
	import { browser } from '$app/env';
    import { db, auth } from '../firebase';
    import { getStores } from "$app/stores";
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import Footer from '../components/Footer.svelte';

    let userInfo = {};
    let userLoaded = false;
    let userId = ""; //used for latest plays component

    const { session } = getStores();

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
            if (browser) {
                session.set({
                    errMsg: "Please sign in again.",
                    errCode: 201,
                });
                goto("/error");
            }
        }
    }
    
    //on component load, log into firebase
    onMount(() => {
        loginToFirebase();
    })
</script>

<Navbar/>
{#if userLoaded}
    <p>Signed in as {userInfo.displayName}</p>
    
    <p>{JSON.stringify(userInfo)}</p>

    <h2>Latest plays</h2>
{:else}
    <p>Not signed in</p>
{/if}
<Footer/>

<style>
</style>
