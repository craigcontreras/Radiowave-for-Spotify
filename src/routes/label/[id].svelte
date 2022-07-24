<script>
	import UploadFile from './../../components/UploadFile.svelte';
	import Modal from './../../components/Modal.svelte';
	import Icon from 'svelte-awesome';
    import { faYoutube } from '@fortawesome/free-brands-svg-icons/faYoutube';
    import { faTwitter } from '@fortawesome/free-brands-svg-icons/faTwitter';
    import { faInstagram } from '@fortawesome/free-brands-svg-icons/faInstagram';
    import { faFacebook } from '@fortawesome/free-brands-svg-icons/faFacebook';
    import { faGlobe } from '@fortawesome/free-solid-svg-icons/faGlobe';
    import { faPencil } from '@fortawesome/free-solid-svg-icons/faPencil';
    import { slide } from "svelte/transition";
	import { page } from '$app/stores';
    import { browser } from "$app/env";
    import { goto } from "$app/navigation";
    import { doc, getDoc, increment, setDoc } from "firebase/firestore";
    import { onMount } from "svelte";
    import { auth, db } from "../../firebase.js";

    let editBiography = "";
    let userLoaded = false;
    let labelData = {};
    let changeMode = false;
    let biographyCollapsed = false;
    let hideModal = true;
    let photoHref = "https://firebasestorage.googleapis.com/v0/b/radiowavemusic.appspot.com/o/images%2Fno%20photo%20found.jpg?alt=media&token=678e386f-707c-4ca7-881b-4fbe90db8ca7";

    let twitterLink = "";
    let instagramLink = "";
    let youtubeLink = "";
    let facebookLink = "";
    let websiteLink = "";

    onMount(() => {
        loginToFirebase();
    })

    function getCurrentUser() {
        return new Promise((resolve, reject) => {
            if (userLoaded) {
                resolve(auth.currentUser);
            }
            const unsubscribe = auth.onAuthStateChanged(user => {
                userLoaded = true;
                unsubscribe();
                resolve(user);
            }, reject);
        });
    }

    async function loginToFirebase() {
        const user = await getCurrentUser();
        if (user !== null) {
            const labelDataDocument = await getDoc(doc(db, `labels/${$page.params.id}`));
            if (labelDataDocument.exists()) {
                labelData = labelDataDocument.data();
                if (labelData?.photoHref) {
                    photoHref = labelData?.photoHref;
                }
                editBiography = labelData?.biography;
                websiteLink = labelData?.websiteHref;
                youtubeLink = labelData?.youtubeHref;
                twitterLink = labelData?.twitterHref;
                instagramLink = labelData?.instagramHref;
                facebookLink = labelData?.facebookHref;
            } else {
                if (browser) {
                    goto("/error");
                }
            }
        } else {
            if (browser) {
                goto("/error");
            }
        }
    }

    function enterChangeMode() {
        changeMode = !changeMode;
        biographyCollapsed = true;
    }
</script>

<Modal header="Upload image" bind:hideModal={hideModal}><svelte:fragment slot="body">
    <UploadFile bind:hideModal={hideModal} on:completedupload={(event) => {
        photoHref = event.detail.href;
    }} documentPath="labels/{$page.params.id}"/>
</svelte:fragment></Modal>

<div class="page mx-6">
    <div class="mt-2 text-sm breadcrumbs">
        <ul>
            <li><a href="/label/all">Labels</a></li>
            <li>{labelData?.name}</li>
        </ul>
    </div>
    
    <div class="flex justify-between mt-6">
        <div class="header sticky top-6 h-full basis-1/5 flex flex-col justify-center items-center">
            <span class="max-w-[10rem]">
                <span>
                    <img on:click={() => {
                        if (changeMode) { hideModal = !hideModal }
                    }} class:cursor-pointer={changeMode} class="rounded-full drop-shadow-xl hover:-translate-y-1 transition-all h-40 w-40 min-h-[10rem] min-w-[10rem]" src={photoHref} alt="">
                    <span class:hidden={!changeMode} class="transition-all hover:scale-125 absolute top-0 px-2 py-1 cursor-pointer rounded-full drop-shadow-xl bg-slate-700" on:click={() => {
                        if (changeMode) { hideModal = !hideModal }
                    }}><Icon data={faPencil}/></span>
                </span>
                <h2 class="text-2xl break-all text-center font-black mt-4">{labelData?.name}</h2>
            </span>
            <div class="history w-3/4 mt-4 text-xs transition-all hover:-translate-y-1 p-4 drop-shadow-xl rounded-lg bg-gray-800">
                <h2 class="italic inline text-gray-400">HISTORY</h2>
                <button class="float-right inline" on:click={() => {
                    biographyCollapsed = !biographyCollapsed;
                }}>Collapse</button>
                
                {#if biographyCollapsed}
                    <div transition:slide>
                        <div id="divider" class="w-full bg-gray-700 h-0.5"></div>
                        {#if changeMode}
                            <form action="" on:submit|preventDefault={async () => {
                                await setDoc(doc(db, `labels/${$page.params.id}`), {
                                    biography: editBiography
                                }, {
                                    merge: true
                                });
                                if (browser) {
                                    location.reload();
                                }
                            }}>
                                <textarea class="w-full bg-transparent" bind:value={editBiography} name="" id="" cols="30" rows="10"></textarea>
                                <button class="mt-1 float-right block text-xs py-1 px-2 bg-slate-700 rounded-lg drop-shadow-xl">Submit</button>    
                            </form>
                        {:else}
                            <p>{labelData?.biography || "No biography found."}</p>
                        {/if}
                    </div>
                {/if}
            </div>

            {#if changeMode}
                <div class="social-media-links w-3/4 mt-4 text-xs transition-all hover:-translate-y-1 p-4 drop-shadow-xl rounded-lg bg-gray-800">
                    <h2 class="italic inline text-gray-400">SOCIALS</h2>
                    <div id="divider" class="w-full bg-gray-700 h-0.5"></div>
                    <form action="" on:submit|preventDefault={async () => {
                        await setDoc(doc(db, `labels/${$page.params.id}`), {
                            twitterHref: twitterLink || "",
                            youtubeHref: youtubeLink || "",
                            websiteHref: websiteLink || "",
                            instagramHref: instagramLink || "",
                            facebookHref: facebookLink || "",
                        }, {
                            merge: true,
                        });

                        if (browser) {
                            location.reload();
                        }
                    }}>
                        <div class="block">
                            <label class="inline-block align-middle" for="twitter"><Icon data={faTwitter}/></label>
                            <input id="twitter" bind:value={twitterLink} placeholder="twitter link" class="ml-1 inline-block align-middle w-5/6 bg-transparent" type="text">
                        </div>
                        <div class="block">
                            <label class="inline-block align-middle" for="instagram"><Icon data={faInstagram}/></label>
                            <input id="instagram" bind:value={instagramLink} placeholder="instagram link" class="ml-1 inline-block align-middle w-5/6 bg-transparent" type="text">
                        </div>
                        <div class="block">
                            <label class="inline-block align-middle" for="facebook"><Icon data={faFacebook}/></label>
                            <input id="facebook" bind:value={facebookLink} placeholder="facebook link" class="ml-1 inline-block align-middle w-5/6 bg-transparent" type="text">
                        </div>
                        <div class="block">
                            <label class="inline-block align-middle" for="youtube"><Icon data={faYoutube}/></label>
                            <input id="youtube" bind:value={youtubeLink} placeholder="youtube link" class="ml-1 inline-block align-middle w-5/6 bg-transparent" type="text">
                        </div>
                        <div class="block">
                            <label class="inline-block align-middle" for="website"><Icon data={faGlobe}/></label>
                            <input id="website" bind:value={websiteLink} placeholder="website link" class="ml-1 inline-block align-middle w-5/6 bg-transparent" type="text">
                        </div>
                        <button class="mt-1 float-right block text-xs py-1 px-2 bg-slate-700 rounded-lg drop-shadow-xl">Submit</button>    
                    </form>
                </div>
            {/if}

            {#if !changeMode && (labelData?.twitterHref?.trim() !== "" || labelData?.instagramHref?.trim() !== "" || labelData?.facebookHref?.trim() !== "" || labelData?.youtubeHref?.trim() !== "" || labelData?.websiteHref?.trim() !== "")}
                <div class="socials mt-6 text-xs w-3/4 flex justify-evenly drop-shadow-lg">
                    {#if labelData?.twitterHref}
                        <a class="transition-all hover:-translate-y-[0.10rem]" href="{labelData?.twitterHref}"><Icon data={faTwitter}/></a>
                    {/if}
                    {#if labelData?.instagramHref}
                        <a class="transition-all hover:-translate-y-[0.10rem]" href="{labelData?.instagramHref}"><Icon data={faInstagram}/></a>
                    {/if}
                    {#if labelData?.facebookHref}
                        <a class="transition-all hover:-translate-y-[0.10rem]" href="{labelData?.facebookHref}"><Icon data={faFacebook}/></a>
                    {/if}
                    {#if labelData?.youtubeHref}
                        <a class="transition-all hover:-translate-y-[0.10rem]1" href="{labelData?.youtubeHref}"><Icon data={faYoutube}/></a>
                    {/if}
                    {#if labelData?.websiteHref}
                        <a class="transition-all hover:-translate-y-[0.10rem]" href="{labelData?.websiteHref}"><Icon data={faGlobe}/></a>
                    {/if}
                </div>
            {/if}
            <button class="text-xs my-6 opacity-10 transition-all hover:opacity-100 self-start" on:click={enterChangeMode}>Change</button>
        </div>
        <div class="content basis-4/5 pr-14">
            <h2 class="text-4xl font-black">Music released by {labelData?.name}</h2>
            <p></p>
        </div>
    </div>
</div>

<style>

</style>