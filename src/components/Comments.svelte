<script>
	import { goto } from '$app/navigation';
	import { browser } from '$app/env';
    import { auth, db } from "../firebase.js";
    import { writeBatch, arrayUnion, arrayRemove, getDocs, doc, getDoc, serverTimestamp } from 'firebase/firestore';
    import { onMount } from 'svelte';

    export let docName;
    export let docCategory;
    let userData = "";
    let comments = [];

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
            userData = user;
            const allComments = await getDoc(doc(db, `comments/${docName}-${docCategory}`));
            comments = allComments.data().comments;
        } else {
            if (browser) {
                goto("/error");
            }
        }
    }

    async function submitComment(comment) {
        const batch = writeBatch();
        const commentData = {
            comment,
            timestamp: serverTimestamp(),
            author: userData.uid,
        }
        batch.update(doc(db, `users/${userData.uid}/comments/${docName}-${docCategory}`), {
            comments: arrayUnion(commentData)
        });
        batch.update(doc(db, `comments/${docName}-${docCategory}`), {
            comments: arrayUnion(commentData)
        });
        await batch.commit();

        if (browser) {
            location.reload();
        }
    }

    async function deleteComment(comment) {
        const batch = writeBatch();
        const commentData = {
            comment,
            timestamp: serverTimestamp(),
            author: userData.uid,
        }
        batch.delete(doc(db, `users/${userData.uid}/comments/${docName}-${docCategory}`), {
            comments: arrayRemove(commentData)
        });
        batch.delete(doc(db, `comments/${docName}-${docCategory}`), {
            comments: arrayRemove(commentData)
        });
        await batch.commit();

        if (browser) {
            location.reload();
        }
    }
</script>

<!-- batch write to user/{user}/comments/{prop of doc name}
    for use in user's page into an array
    and also to comments/{prop of doc name} into an array
    for use on the specified page
 -->

<style>
    
</style>