<script>
    export let classes;
    export let showDropdown = false;
    export let label;
    export let buttonContent;
</script>

<span class="mr-2">{label}</span>
<div class="inline-flex items-center mr-10">
    <button on:click={() => {
        showDropdown = !showDropdown;
    }} class="px-3 py-2 rounded-lg drop-shadow-xl bg-stone-800 hover:-translate-y-1 transition-all">{buttonContent}</button>
    <div class:hidden={!showDropdown} class="{classes} self-start max-w-[10rem] break-all w-40 text-sm drop-shadow-xl mt-10">
        <slot name="elements"/>
    </div>
</div>

<style>

</style>