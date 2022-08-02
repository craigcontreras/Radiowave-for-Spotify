<script>
    import { createEventDispatcher, onMount } from "svelte";

    const dispatch = createEventDispatcher();
    export let items;
    export let hideTypeaheadCreate;
    export let currentLabelText;
    export let classes;

    onMount(() => {
        if (!currentLabelText || currentLabelText.trim() === "") {
            hideTypeaheadCreate = true;
        } else {
            hideTypeaheadCreate = false;
        }
    })
    
    function sendSelectedInput(text, id) {
        dispatch("typeaheadselected", {
            text,
            id
        });
    }

    function createDocument() {
        dispatch("typeaheadcreate", {});
    }
</script>

<ul class="{classes} max-w-[10rem] break-all w-40 text-sm drop-shadow-xl">
    <li class:hidden={hideTypeaheadCreate} on:click={createDocument} class="cursor-pointer hover:bg-stone-900 m-0 p-2 bg-stone-800 first:rounded-t-lg last:rounded-b-lg">Create "{currentLabelText}"</li>
    {#each items as item}
        <li on:click={() => {
            sendSelectedInput(item.displayName, item.id);
        }} class="cursor-pointer hover:bg-stone-900 m-0 p-2 bg-stone-800 first:rounded-t-lg last:rounded-b-lg">{item.displayName}</li>
    {/each}
</ul>

<style>

</style>