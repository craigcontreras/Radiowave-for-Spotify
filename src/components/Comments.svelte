<script>
	import { goto } from '$app/navigation';
	import { browser } from '$app/env';
    import { auth, db } from "../firebase.js";
    import { setDoc, deleteDoc, getDocs, doc, query, orderBy, serverTimestamp, collection, getDoc } from 'firebase/firestore';
    import { onMount } from 'svelte';
    import Comment from './Comment.svelte';

    export let fromCollection;
    export let fromDoc;
    let currentUserId = "";
    let comments = [];
    let commentMessage = "";
    let userLoaded = false;

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

    function addToComments(data) {
        comments.push(data);
        comments = comments;
    }

    async function loginToFirebase() {
        const user = await getCurrentUser();
        if (user !== null) {
            currentUserId = user.uid;
            
            const allCommentsRef = collection(db, fromCollection);
            const allCommentsQuery = query(allCommentsRef, orderBy("timestamp"));
            const allComments = await getDocs(allCommentsQuery);

            if (!allComments.empty) {
                allComments.forEach((doc) => {
                    addToComments(doc.data());
                });
            }
        } else {
            if (browser) {
                goto("/error");
            }
        }
    }

    async function submitComment(comment) {
        await setDoc(doc(db, fromDoc), {
            comment,
            timestamp: serverTimestamp(),
            author: currentUserId
        });

        if (browser) {
            location.reload();
        }
    }

    async function deleteComment(comment) {
        await deleteDoc(doc(db, fromDoc));
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

<form action="" on:submit|preventDefault>
    <div class="w-10/12 pb-2">
        <textarea class="hover:-translate-y-1 focus:drop-shadow-xl transition-all textarea textarea-bordered w-full" bind:value={commentMessage} required placeholder="Comment..." cols="20" rows="10"></textarea>
    </div>
    <button class="hover:-translate-y-1 transition-all font-bold btn btn-info btn-sm" on:click|preventDefault={() => {
        if (!commentMessage || commentMessage.length === 0) {
            //insert tooltips
        } else {
            submitComment(commentMessage);
        }
    }}>Submit</button>
</form>

{#each comments as comment}
    <Comment commentMessage={comment.comment} commentAuthor={comment.author} commentDate={comment.timestamp}/>
{/each}

<style>
    
</style>