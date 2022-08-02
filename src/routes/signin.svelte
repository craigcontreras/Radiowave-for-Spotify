<script>
    import { browser } from '$app/env';
    import { goto } from '$app/navigation';
	import { session } from '$app/stores';
    import axios from "axios";
    import { signInWithCustomToken } from 'firebase/auth';
    import { get } from 'svelte/store';
    import { auth } from "../firebase.js";

    const {userAgent} = get(session);

    //try to decrypt the firebase token that was passed on from the server when logging in
    const res = axios({
        method: "post",
        url: "https://radiowave.app/api/v1/firebase",
        headers: {},
        data: {
            access_firebase: $session.access_firebase,
        },
    });

    res.then(async (data) => {
        //sign into firebase
        let decrypted = data.data.access_firebase;
        const loggingIn = await signInWithCustomToken(auth, decrypted);

        await Promise.all([loggingIn]);

        //when done, go to the account page
        if (browser) {
            goto("/account");
        }
    }).catch((err) => {
        throw new Error(err);
    });
</script>

<p>Logging in...</p>

<style>

</style>