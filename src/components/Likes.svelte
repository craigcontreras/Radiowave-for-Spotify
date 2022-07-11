<script>
	import { goto } from '$app/navigation';
	import { browser } from '$app/env';
	import includes from 'lodash/includes.js';
    import { doc, getDoc, runTransaction, arrayUnion, arrayRemove } from "firebase/firestore";
    import { auth, db } from '../firebase.js';
    import { onMount } from 'svelte';

    export let fromDoc;

    const reviewRef = doc(db, fromDoc);
    let userLoaded = false;
    let currentUserId = "";
    let likes = [];
    let liked = false;

    // function addToLikes(data) {
    //     likes.push(data);
    //     likes = likes;
    // }

    // function findAndRemoveFromLikes(data) {
    //     remove(likes, e => {
    //         return e === data;
    //     });
    //     likes = likes;
    // }

    onMount(() => {
        loginToFirebase();
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
        })
    }

    async function loginToFirebase() {
        const user = await getCurrentUser();
        if (user !== null) {
            //populating likes array
            currentUserId = user.uid;
            const currentDoc = await getDoc(reviewRef);
            likes = currentDoc.data().likes;

            if (includes(likes, currentUserId)) {
                liked = true;
            }
        } else {
            if (browser) {
                goto("/error");
            }
        }
    }

    async function like() {
        try {
            const likesArr = await runTransaction(db, async (transaction) => {
                const reviewDoc = await transaction.get(doc(db, fromDoc));
                if (!reviewDoc.exists()) {
                    throw "Review no longer exists";
                }

                const likeIncrement = reviewDoc.data().likeCount + 1;

                transaction.update(doc(db, fromDoc), {
                    likeCount: likeIncrement,
                    likes: arrayUnion(currentUserId),
                });

                return reviewDoc.data().likes;
            });

            likes = likesArr;
            liked = true;
        } catch (e) {
            console.log("Unable to like this");
            console.log(e);
        }
    }

    async function unlike() {
        try {
            const likesArr = await runTransaction(db, async (transaction) => {
                const reviewDoc = await transaction.get(doc(db, fromDoc));
                if (!reviewDoc.exists()) {
                    throw "Review no longer exists";
                }

                if (!includes(reviewDoc.data().likes, currentUserId)) {
                    throw "User has not liked this post";
                }
                
                const likeDecrement = reviewDoc.data().likeCount - 1;

                transaction.update(doc(db, fromDoc), {
                    likeCount: likeDecrement,
                    likes: arrayRemove(currentUserId),
                });

                return reviewDoc.data().likes;
            });

            likes = likesArr;
            liked = false;
        } catch (e) {
            console.log("Unable to unlike this");
        }
    }
</script>

{#if liked}
    <button on:click|preventDefault={unlike}>Dislike</button>
{:else}
    <button on:click|preventDefault={like}>Like</button>
{/if}

<style>

</style>