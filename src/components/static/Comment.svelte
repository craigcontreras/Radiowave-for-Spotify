<script>
    import { doc, getDoc } from "firebase/firestore";
    import { db } from "../firebase.js";

    export let commentMessage;
    export let commentAuthor;
    export let commentDate;
</script>

<!-- Add a max width to all of the text so it doesn't overflow or smush the image -->
<div class="hover:-translate-y-1 transition-all drop-shadow-lg mt-6 mb-6 p-4 rounded-lg bg-black">
    {#await getDoc(doc(db, `users/${commentAuthor}`))}
        <a href="/user/{commentAuthor}"><p class="text-xl font-bold">{commentAuthor}</p></a>
    {:then data}
        <a href="/user/{commentAuthor}">
            <img class="inline-block align-middle rounded-full h-10 w-10" src="{data.get("photoURL")}" alt="Profile picture of {data.get("displayName")}">
            <p class="pl-2 inline-block text-xl font-bold">{data.get("displayName")}</p>    
        </a>
    {:catch err}
        <a href="/user/{commentAuthor}"><p class="text-xl font-bold">{commentAuthor}</p></a>
    {/await}
    <p class="text-lg">{commentMessage}</p>
    <p class="text-sm">Written on {new Date(commentDate?.seconds * 1000)}</p>
</div>

<style>

</style>