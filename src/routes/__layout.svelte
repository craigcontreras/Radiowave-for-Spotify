<script context="module">
    /** @type {import('@sveltejs/kit').Load} */
    export const load = async ({ url }) => ({ props: { url } });
</script>

<script>
	import PageTransition from './../components/PageTransition.svelte';
	import Navbar from './../components/Navbar.svelte';
    import "../app.css";
    import Footer from '../components/Footer.svelte';
    export let url;
</script>

{#if !url.toString().includes("/api")}
<Navbar/>
{/if}
<PageTransition {url}>
    <slot />
</PageTransition>
{#if !url.toString().includes("/api")}
<Footer/>
{/if}
