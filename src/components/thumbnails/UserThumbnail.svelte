<script>
    export let imgSrc;
    export let username;
    export let showUsername = false;
</script>

<div>
    <a href="/user/{username}"><img loading="lazy" class="transition-all hover:-translate-y-1 drop-shadow-md rounded-full h-10 w-10" src={imgSrc} alt="{username}'s profile"></a>
    {#if showUsername}
        <p class="text-sm">{username}</p>
    {/if}
</div>

<style>

</style>