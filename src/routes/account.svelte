<script context="module">
	import SEO from './../components/utilities/SEO.svelte';
    import { db, auth } from '../firebase';

    let userInfo;
    let userLoaded = false;
    let invalidUser = true;

    export async function load({params}) {
        await loginToFirebase();
        return {
            props: {
                invalidUser,
                userInfo
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
        })
    }

    async function loginToFirebase() {
        const user = await getCurrentUser(auth);
        if (user !== null) {
            invalidUser = false;
            userInfo = user;
            return "Completed";
        } else {
            throw new Error("User not logged in");
        }
    }
</script>

<script>
    export let userInfo = {};
    export let invalidUser;
</script>

<SEO title="Account - Radiowave for Spotify" description="View your Spotify account stats and review music from Spotify's extensive back catalog on Radiowave for Spotify." image=""/>
{#if !invalidUser}
    <p>Signed in as {userInfo.displayName}</p>
    
    <p>{JSON.stringify(userInfo)}</p>
{:else}
    <p>Not signed in</p>
{/if}

<style>
</style>
