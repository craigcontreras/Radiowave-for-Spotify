<script context="module">
	import { page } from '$app/stores';
    import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
    import { db } from "../../../firebase";

    let albumData = [];

    export async function load({params}) {
        await loginToFirebase(params);
        return {
            props: {
                albumData,
            }
        }
    }

    async function loginToFirebase(params) {
        const albumReference = collection(db, "albums");
        const albumQuery = query(albumReference, where("year", "==", parseInt(params.year)), orderBy("avgRating", "desc"), limit(25));
        const albumDocs = await getDocs(albumQuery);
        albumDocs.forEach(doc => {
            albumData.push(doc.data());
            albumData = albumData;
        });
        return "Completed";
    }
</script>

<script>
    export let albumData = [];
</script>

<div class="mx-6 page">
    <div class="my-2 text-sm breadcrumbs">
        <ul>
            <li><a href="/track/top/{new Date().getFullYear()}">Tracks</a></li>
            <li><a href="/track/top/{$page.params.year}">Top of {$page.params.year}</a></li>
        </ul>
    </div>
    <div class="content mt-6">
        <p>{albumData}</p>
        {#each albumData as data}
            {JSON.stringify(data)}
        {/each}
    </div>
</div>

<style>

</style>