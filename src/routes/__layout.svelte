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

<Navbar/>
<PageTransition {url}>
    <slot />
</PageTransition>
<Footer/>