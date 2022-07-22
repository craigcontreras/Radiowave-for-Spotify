<script>
    import { fly } from "svelte/transition";
    export let url = "";
    const duration = 300;
</script>

{#key url}
    <div in:fly={{
        x: -20,
        duration,
        delay: duration,
    }} out:fly={{
        x: -20,
        duration,
        delay: duration,
    }}><slot/></div>
{/key}

<style>
    
</style>