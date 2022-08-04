<script>
	import { goto } from '$app/navigation';
	import { browser } from '$app/env';
    import { auth, db } from "../../firebase.js";
    import { setDoc, deleteDoc, getDocs, doc, query, orderBy, serverTimestamp, collection, getDoc, limit, startAfter } from 'firebase/firestore';
    import { onMount } from 'svelte';
    import Comment from '../static/Comment.svelte';
    import { get } from 'svelte/store';
    import { session } from '$app/stores';

    export let fromCollection;
    export let fromDoc;
    let currentUserId = "";
    let comments = [];
    let commentMessage = "";
    let userLoaded = false;
    let invalidUser = true;
    let lastVisible;
    let currentCommentSize;

    const {userAgent} = get(session);

    onMount(() => {
        loginToFirebase();
    });

    async function paginateData() {
        if (lastVisible || currentCommentSize < 5) {    
            const allCommentsRef = collection(db, fromCollection);
            const allCommentsQuery = query(allCommentsRef, orderBy("timestamp"), startAfter(lastVisible), limit(5));
            const allComments = await getDocs(allCommentsQuery);

            lastVisible = allComments.docs[allComments.docs.length - 1];
            currentCommentSize = allComments.docs.length;

            allComments.forEach((doc) => {
                addToComments(doc.data());
            });
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

    function addToComments(data) {
        comments.push(data);
        comments = comments;
    }

    async function loginToFirebase() {
        const allCommentsRef = collection(db, fromCollection);
        const allCommentsQuery = query(allCommentsRef, orderBy("timestamp"), limit(5));
        const allComments = await getDocs(allCommentsQuery);

        lastVisible = allComments.docs[allComments.docs.length - 1];
        currentCommentSize = allComments.docs.length;

        if (!allComments.empty) {
            allComments.forEach((doc) => {
                addToComments(doc.data());
            });
        }
        
        const user = await getCurrentUser();
        if (user !== null) {
            invalidUser = false;
            currentUserId = user.uid;            
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

{#if !invalidUser}
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
{:else}
<p>Please log in to comment.</p>
{/if}

<div class="comments">
    {#each comments as comment}
        <Comment commentMessage={comment.comment} commentAuthor={comment.author} commentDate={comment.timestamp}/>
    {/each}
    {#if currentCommentSize >= 5}
        <button class="text-center py-4 px-8 bg-black hover:-translate-y-1 drop-shadow-lg rounded-lg transition-all" on:click={paginateData}>Load more comments</button>
    {/if}
</div>

<style>
    
</style>