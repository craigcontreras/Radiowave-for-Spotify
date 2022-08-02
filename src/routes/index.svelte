<script>
	import Seo from './../components/utilities/SEO.svelte';
	import { browser } from '$app/env';
	import { goto } from '$app/navigation';
    import { onMount } from "svelte";
    import { auth } from "../firebase.js";

    let userLoaded = false;

    onMount(async () => {
        const user = await getCurrentUser();
        if (user !== null) {
            if (browser) {
                goto("/home");
            }
        }
    });

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
        });
    }
</script>

<Seo name="" description="" image=""/>
<a href="/login">Login</a>

<style>
</style>