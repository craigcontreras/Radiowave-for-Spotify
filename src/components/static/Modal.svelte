<script>
    import Icon from "svelte-awesome";
    import { faClose } from '@fortawesome/free-solid-svg-icons/faClose';

    export let hideModal = true;
    export let header = "";
</script>

<div class:hidden={hideModal} class="fixed top-0 left-0 z-50 w-full h-full flex items-center justify-center p-8">
    <div on:click={() => {
        hideModal = true;
    }} class="bg-stone-900 opacity-50 fixed w-full h-full"></div>
    <div class="bg-black h-full w-1/2 mx-auto rounded-lg drop-shadow-xl z-50 overflow-y-auto">
        <div class="header flex justify-between items-center py-5 px-8">
            <h2 class="text-2xl font-extrabold">{header}</h2>
            <button id="close" on:click={() => {
                hideModal = true;
            }}><Icon data={faClose}/></button>
        </div>
        <div class="content px-8">
            <slot name="body"/>
        </div>
    </div>
</div>

<style>

</style>