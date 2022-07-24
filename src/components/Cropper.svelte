<svelte:head>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/2.0.0-alpha.2/cropper.css" rel="stylesheet">
	<script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/2.0.0-alpha.2/cropper.min.js"></script>
</svelte:head>

<script>
	import { slide } from 'svelte/transition';
    import { createEventDispatcher } from 'svelte';

    export let href;
    let imgLoaded = false;
    let hideSubmit = true;
    export let imgElement, cropper, showCropper;
    let hideModal;
    const dispatch = createEventDispatcher();

    function initCropper() {
        showCropper = true;
        if (!imgLoaded) {
            imgLoaded = true;
            cropper = new Cropper(imgElement, {
                aspectRatio: 1 / 1,
                viewMode: 1,
                movable: false,
                rotatable: false,
                zoomable: false,
                ready: function (event) {
                    hideSubmit = false;
                },
            });
        }
    }

    function cropperSubmitted() {
        cropper.getCroppedCanvas().toBlob((blob) => {
            dispatch("croppersubmitted", {
                blob,
            });
            hideModal = true;
            hideSubmit = true;
            showCropper = false;
        })
    }
</script>

<form class:hidden={!showCropper} action="" on:submit|preventDefault={cropperSubmitted}>
    <div>
        <img on:load={initCropper} class="block max-w-full" src={href} alt="" bind:this={imgElement}>
    </div>

    {#if !hideSubmit}
        <button transition:slide class="transition-all hover:-translate-y-1 block float-right mt-6 py-4 px-6 bg-slate-700 rounded-lg drop-shadow-xl" type="submit">Submit</button>
    {/if}
</form>

<style>
    
</style>