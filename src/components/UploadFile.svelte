<script>
	import { slide } from 'svelte/transition';
	import Cropper from './Cropper.svelte';
    import imageCompression from "browser-image-compression";
    import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
    import { db, storage } from "../firebase.js";
    import { v4 as uuidv4 } from "uuid";
    import { doc, setDoc } from 'firebase/firestore';
    import { createEventDispatcher } from 'svelte';
    import includes from 'lodash/includes.js';

    let hideModal;
    let href = "";
    let fileElement;
    let startedUpload;
    let status = "";
    let fileName = "none";
    let progress = 0;
    let cropper;
    let hideFileUpload;
    let itemDrag = false;
    let draggedFiles = [];
    let displayError = false;

    export let fileReference;
    export let documentPath;

    const dispatch = createEventDispatcher();

    async function handleFileUpload() {
        const file = fileElement.files[0];
        fileName = file.name;
        const compressedFile = await imageCompression(file, {
            maxSizeMB: 1,
            useWebWorker: true,
            maxWidthOrHeight: 400,
            fileType: "image/jpeg",
        });
        await initialUploadToStorage(compressedFile);
        fileElement.value = "no file";
    }

    async function initialUploadToStorage(blob) {
        fileReference = ref(storage, "images/" + uuidv4());
        const uploadTask = uploadBytesResumable(fileReference, blob, {
            contentType: blob.type,   
        });
        startedUpload = true;
        uploadTask.on("state_changed", (snapshot) => {
            progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            
            switch (snapshot.state) {
                case "paused":
                    status = "Paused";
                    break;
                case "running":
                    status = "Running";
                    break;
            }
        }, (err) => {
            switch (err.code) {
                case "storage/unauthorized":
                    status = "Error";
                    break;
                case "storage/canceled":
                    status = "Canceled by user";
                    break;
                case "storage/unknown":
                    status = "Error. Please try again.";
                    break;
            }
        }, () => {
            getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => {
                href = downloadURL;
                if (cropper) {
                    cropper.destroy();
                    cropper.replace(href);
                }
                startedUpload = false;

                hideModal = false;
            })
        });
    }

    async function finalUploadToStorage(blob) {
        const fileReference = ref(storage, "images/" + uuidv4());
        const compressedFile = await imageCompression(blob, {
            maxSizeMB: 1,
            useWebWorker: true,
            maxWidthOrHeight: 400,
            fileType: "image/jpeg",
        });
        const uploadTask = uploadBytesResumable(fileReference, compressedFile, {
            contentType: compressedFile.type,   
        });
        startedUpload = true;
        uploadTask.on("state_changed", (snapshot) => {
            progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            
            switch (snapshot.state) {
                case "paused":
                    status = "Paused";
                    break;
                case "running":
                    status = "Running";
                    break;
            }
        }, (err) => {
            switch (err.code) {
                case "storage/unauthorized":
                    status = "Error";
                    break;
                case "storage/canceled":
                    status = "Canceled by user";
                    break;
                case "storage/unknown":
                    status = "Error. Please try again.";
                    break;
            }
        }, () => {
            getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => {
                onCompletedUpload(downloadURL);
                await setDoc(doc(db, documentPath), {
                    photoHref: downloadURL,
                }, {
                    merge: true
                });
                startedUpload = false;
            })
        });
    }

    function onCompletedUpload(downloadURL) {
        dispatch("completedupload", {
            href: downloadURL
        });
    }

    function handleCropSubmission(event) {
        deleteObject(fileReference).then(() => {
            finalUploadToStorage(event.detail.blob);
        }).catch((err) => {

        });
    }

    function onDragEnter() {
        itemDrag = true;
    }
    
    function onDragLeave() {
        itemDrag = false;
    }
</script>

<Cropper bind:showCropper={hideFileUpload} bind:hideModal={hideModal} on:croppersubmitted={handleCropSubmission} bind:cropper={cropper} {href}/>

<form action="" class:hidden={hideFileUpload} on:submit|preventDefault={handleFileUpload}>
    <label on:drag|stopPropagation|preventDefault 
        on:dragstart|stopPropagation|preventDefault 
        on:dragend|stopPropagation|preventDefault={onDragLeave} 
        on:dragover|stopPropagation|preventDefault={onDragEnter}
        on:dragenter|stopPropagation|preventDefault={onDragEnter}
        on:dragleave|stopPropagation|preventDefault={onDragLeave}
        on:drop|stopPropagation|preventDefault={(event) => {
            onDragLeave();

            if (event.dataTransfer.files.length === 1 && includes(["image/jpeg", "image/png"], event.dataTransfer.files[0].type)) {
                fileElement.files = event.dataTransfer.files;
                fileName = event.dataTransfer.files[0].name;
            } else {
                displayError = true;
                setTimeout(() => {
                    displayError = false;
                }, 5000);
            }
        }} for="file-upload">
        <div class:bg-slate-600={itemDrag} class="transition-all hover:-translate-y-1 border-2 rounded-lg border-slate-700 border-dashed w-full h-40 flex flex-col items-center justify-center">
            <p class="text-slate-700">Click or drag your image into this box</p>
            <p class="text-slate-700">File uploaded: {fileName}</p>
            <p class="text-slate-700">Supports .jpeg, .jpg, .png</p>
            {#if displayError}
                <p transition:slide class="text-error">You can only upload .jpeg or .png files and only one file.</p>
            {/if}
            {#if startedUpload}
                <div transition:slide>
                    <progress class="progress progress-primary w-56" value={progress} max="100"></progress><span class="ml-1">{progress}%</span>
                </div>
            {/if}
        </div>
    </label>
    <input on:change={(event) => {
        if (startedUpload) {
            event.preventDefault();
        }
        const file = fileElement.files[0];
        fileName = file.name;
    }} id="file-upload" class="hidden" type="file" accept="image/png,image/jpeg" bind:this={fileElement}>
    {#if !startedUpload && !hideFileUpload}
        <button class:-z-50={startedUpload} transition:slide class="transition-all hover:-translate-y-1 block float-right mt-6 py-4 px-6 bg-slate-700 rounded-lg drop-shadow-xl" type="submit">Upload</button>
    {/if}
</form>

<style>
    
</style>