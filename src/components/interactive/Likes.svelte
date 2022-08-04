<script>
	import { goto } from '$app/navigation';
    import { page } from '$app/stores';
	import { browser } from '$app/env';
	import includes from 'lodash/includes.js';
    import { doc, getDoc, runTransaction, arrayUnion, arrayRemove, increment, setDoc } from "firebase/firestore";
    import { auth, db } from '../../firebase.js';
    import { onMount } from 'svelte';
    import { get } from 'svelte/store';
    import { session } from '$app/stores';

    export let fromDoc;
    export let reviewType = "";
    export let trackId = "";
    export let reviewAuthor = "";
    export let trackReview = true;

    const reviewRef = doc(db, fromDoc);
    let userLoaded = false;
    let currentUserId = "";
    let likes = [];
    let liked = false;
    let invalidUser = true;

    const {userAgent} = get(session);

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
        const currentDoc = await getDoc(reviewRef);
        likes = currentDoc.data().likes;

        const user = await getCurrentUser();
        if (user !== null) {
            invalidUser = false;
            //populating likes array
            currentUserId = user.uid;

            if (includes(likes, currentUserId)) {
                liked = true;
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

                let likeIncrement = reviewDoc.data().likeCount + 1;

                if (isNaN(likeIncrement)) {
                    likeIncrement = 1;
                }

                transaction.update(doc(db, fromDoc), {
                    likeCount: likeIncrement,
                    likes: arrayUnion(currentUserId),
                });

                return reviewDoc.data().likes;
            });

            likes = likesArr;
            liked = true;

            if (trackReview) {
                const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
                const dateObj = new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
                const date = `${dateObj.getFullYear()}-${dateObj.getMonth() + 1}-${dateObj.getDate()}`;

                let statisticsData = {
                    track: trackId,
                    author: reviewAuthor,
                    type: reviewType,
                    stats: {}
                };

                statisticsData.stats[date] = {
                    likes: increment(1),
                }

                await setDoc(doc(db, `review-statistics/${trackId}-${reviewAuthor}`), statisticsData, {
                    merge: true
                });
            }
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
                
                let likeDecrement = reviewDoc.data().likeCount - 1;

                if (isNaN(likeDecrement)) {
                    likeDecrement = 0;
                }

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

{#if !invalidUser}
    {#if liked}
        <button on:click|preventDefault={unlike}>
            <p>Unlike</p>
        </button>
    {:else}
        <button on:click|preventDefault={like}>
            <p>Like</p>
        </button>
    {/if}
{/if}

<style>

</style>