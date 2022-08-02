<script context="module">
    /** @type {import('@sveltejs/kit').Load} */
    export const load = async ({ url }) => ({ props: { url } });
</script>

<script>
    import { fade } from "svelte/transition";
    import { navigating } from '$app/stores';
	import PageTransition from './../components/utilities/PageTransition.svelte';
	import Navbar from './../components/static/Navbar.svelte';
    import "../app.css";
    import Footer from '../components/static/Footer.svelte';
	import { loading } from './../lib/loading.js';

    export let url;
    $: $loading = !!$navigating;
</script>

{#if !url.toString().includes("/api")}
<Navbar/>
{/if}

<PageTransition {url}>
{#if $loading === false}
    <slot />
{:else}
    <div class="min-h-screen text-center flex items-center justify-center">
        <div style="border-top-color: transparent" class="w-16 h-16 border-4 border-white border-solid rounded-full animate-spin"></div>
    </div>
{/if}
</PageTransition>

{#if !url.toString().includes("/api")}
<Footer/>
{/if}
