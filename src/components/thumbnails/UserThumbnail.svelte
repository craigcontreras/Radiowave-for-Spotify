<script>
    export let imgSrc;
    export let username;
    export let showUsername = false;
</script>

<div>
    <img class="transition-all hover:-translate-y-1 drop-shadow-md rounded-full h-10 w-10" src={imgSrc} alt="{username}'s profile">
    {#if showUsername}
        <p class="text-sm">{username}</p>
    {/if}
</div>

<style>

</style>