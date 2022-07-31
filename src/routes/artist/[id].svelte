<script>
	import BigTrackThumbnail from './../../components/thumbnails/BigTrackThumbnail.svelte';
	import { marked } from 'marked';
	import Icon from 'svelte-awesome';
    import { faYoutube } from '@fortawesome/free-brands-svg-icons/faYoutube';
    import { faTwitter } from '@fortawesome/free-brands-svg-icons/faTwitter';
    import { faInstagram } from '@fortawesome/free-brands-svg-icons/faInstagram';
    import { faFacebook } from '@fortawesome/free-brands-svg-icons/faFacebook';
    import { faGlobe } from '@fortawesome/free-solid-svg-icons/faGlobe';
    import { slide } from "svelte/transition";
	import { page } from '$app/stores';
    import { browser } from "$app/env";
    import { goto } from "$app/navigation";
    import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, startAfter, where } from "firebase/firestore";
    import { onMount } from "svelte";
    import { auth, db } from "../../firebase.js";
    import DOMPurify from "isomorphic-dompurify";
    import remove from 'lodash/remove.js';
    import Modal from '../../components/Modal.svelte';
    import InputWithTypeahead from '../../components/InputWithTypeahead.svelte';
    import axios from 'axios';
    import find from 'lodash/find.js';

    const characterRegex = /^([a-zA-Z0-9\s_-]+)$/

    let editBiography = "";
    $: sanitizedBiography = DOMPurify.sanitize(editBiography, {ALLOWED_TAGS: [], ALLOWED_ATTR: []});
    let userLoaded = false;
    let artistData;
    let artistAlbums = [];
    let artistSingles = [];
    let artistAppearances = [];
    let changeMode = false;
    let biographyCollapsed = false;

    let twitterLink = "";
    let instagramLink = "";
    let youtubeLink = "";
    let facebookLink = "";
    let websiteLink = "";

    let showMoreAppearances = false;
    let showMoreSingles = false;
    let showMoreAlbums = false;

    let currentGenreText = "";
    let genresForQuerying = [];
    let hideTypeaheadCreateForGenres = true;
    let autocompleteResultsForGenres = [];
    let proposedGenres = [];
    let publicGenres = [];
    let hideModalGenres = true;

    let refreshed = 0;
    let refreshedForTracks = 0;
    const id = "4d5e942d117f4de793c86a1c53c3d393";
    let userId = "";

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

    function initialLoad(userAccessToken, userRefreshToken) {
        const spotifyArtist = axios.get(`https://api.spotify.com/v1/artists/${$page.params.id}`, {
            headers: {
                Authorization: `Bearer ${userAccessToken}`
            }
        }).then(async (res) => {
            if (refreshed > 1) {
                if (browser) {
                    goto("/error");
                }
                return;
            } else {
                artistData = {
                    avgRating: 0,
                    numRatings: 0,
                    images: res.data.images,
                    name: res.data.name,
                    popularity: res.data.popularity,
                    id: res.data.id,
                    external_urls: res.data.external_urls.spotify,
                    genre: [],
                    genreNames: [],
                    avgRating: 0,
                    numRatings: 0,
                };

                await setDoc(doc(db, `artists/${$page.params.id}`), artistData);
            }
        }).catch(err => {
            if (refreshed < 1) {
                const params = new URLSearchParams();
                params.append("grant_type", "refresh_token");
                params.append("refresh_token", userRefreshToken);
                params.append("client_id", id);
                axios.post("https://accounts.spotify.com/api/token", params, {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                }).then(async (spotifyData) => {
                    const newAccess = spotifyData.data.access_token;
                    const newRefresh = spotifyData.data.refresh_token;
                    await setDoc(doc(db, `users/${userId}`), {
                        access: newAccess,
                        refresh: newRefresh
                    }, {
                        merge: true
                    });
                    refreshed++;
                    initialLoad(newAccess, newRefresh);
                }).catch(err => {
                    refreshed++;
                });
            } else {
                if (browser) {
                    goto("/error");
                }
            }
        });
    }

    async function getArtistTracksAndAlbums(userAccessToken, userRefreshToken) {
        if (refreshedForTracks > 1) {
            if (browser) {
                goto("/error");
            }
            return;
        }

        const getAlbums = axios.get(`https://api.spotify.com/v1/artists/${$page.params.id}/albums`, {
            params: {
                include_groups: "album",
                limit: "50",
            },
            headers: {
                Authorization: `Bearer ${userAccessToken}`,
            },
        });

        const getTracks = axios.get(`https://api.spotify.com/v1/artists/${$page.params.id}/albums`, {
            params: {
                include_groups: "single",
                limit: "50",
            },
            headers: {
                Authorization: `Bearer ${userAccessToken}`,
            },
        });

        const getAppearances = axios.get(`https://api.spotify.com/v1/artists/${$page.params.id}/albums`, {
            params: {
                include_groups: "appears_on",
                limit: "50",
            },
            headers: {
                Authorization: `Bearer ${userAccessToken}`,
            },
        });

        axios.all([getAlbums, getTracks, getAppearances]).then(axios.spread(async (...allResponses) => {
            const albums = allResponses[0];
            const tracks = allResponses[1];
            const appearances = allResponses[2];

            for (let item of albums.data.items) {
                if (!find(artistAlbums, { normalName: item.name.toLowerCase().replaceAll(/[^a-z0-9A-Z ]/g, "") })) {
                    artistAlbums.push({
                        ...item,
                        normalName: item.name.toLowerCase().replaceAll(/[^a-z0-9A-Z ]/g, ""),
                    });
                }
            }

            artistAlbums = artistAlbums;

            for (let item of tracks.data.items) {
                console.log(item);
                if (!find(artistSingles, { normalName: item.name.replaceAll(" - EP", "").replaceAll(" - Single", "").trim().toLowerCase().replaceAll(/[^a-zA-Z ]/g, "") }) ) {
                    artistSingles.push({
                        ...item,
                        normalName: item.name.replaceAll(" - EP", "").replaceAll(" - Single", "").trim().toLowerCase().replaceAll(/[^a-zA-Z ]/g, ""),
                    });
                }
            }

            artistSingles = artistSingles;

            for (let item of appearances.data.items) {
                if (!find(artistAppearances, { normalName: item.name.replaceAll(" - EP", "").replaceAll(" - Single", "").trim().toLowerCase().replaceAll(/[^a-zA-Z ]/g, "") })) {
                    artistAppearances.push({
                        ...item,
                        normalName: item.name.replaceAll(" - EP", "").replaceAll(" - Single", "").trim().toLowerCase().replaceAll(/[^a-zA-Z ]/g, ""),
                    });
                }
            }

            artistAppearances = artistAppearances;
            refreshedForTracks++;
        })).catch(err => {
            if (refreshedForTracks < 1) {
                const params = new URLSearchParams();
                params.append("grant_type", "refresh_token");
                params.append("refresh_token", userRefreshToken);
                params.append("client_id", id);
                axios.post("https://accounts.spotify.com/api/token", params, {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                }).then(async (spotifyData) => {
                    const newAccess = spotifyData.data.access_token;
                    const newRefresh = spotifyData.data.refresh_token;
                    await setDoc(doc(db, `users/${userId}`), {
                        access: newAccess,
                        refresh: newRefresh
                    }, {
                        merge: true
                    });
                    refreshedForTracks++;
                    getArtistTracksAndAlbums(newAccess, newRefresh);
                }).catch(err => {
                    refreshedForTracks++;
                });
            } else {
                if (browser) {
                    goto("/error");
                }
            }
        });
    }

    async function loginToFirebase() {
        const user = await getCurrentUser();
        if (user !== null) {
            userId = user.uid;
            const userDataDocument = await getDoc(doc(db, `users/${user.uid}`));
            let userAccessToken = userDataDocument.data().access;
            let userRefreshToken = userDataDocument.data().refresh;
            const artistDataDocument = await getDoc(doc(db, `artists/${$page.params.id}`));
            if (artistDataDocument.exists()) {
                artistData = artistDataDocument.data();
                editBiography = artistData?.biography;
                websiteLink = artistData?.websiteHref;
                youtubeLink = artistData?.youtubeHref;
                twitterLink = artistData?.twitterHref;
                instagramLink = artistData?.instagramHref;
                facebookLink = artistData?.facebookHref;
                publicGenres = artistData?.genre,
                genresForQuerying = artistData?.genreNames;
            } else {
                initialLoad(userAccessToken, userRefreshToken);
            }
            getArtistTracksAndAlbums(userAccessToken, userRefreshToken);
        } else {
            if (browser) {
                goto("/error");
            }
        }
    }

    async function submitProposedDetails() {
        await setDoc(doc(db, `artists/${$page.params.id}`), {
            genre: proposedGenres,
            genreNames: genresForQuerying,
        }, {
            merge: true
        });

        return "Changed in Firebase";
    }

    function enterChangeMode() {
        if (changeMode) {
            changeMode = false;
            biographyCollapsed = false;
            autocompleteResultsForGenres = [];
            hideTypeaheadCreateForGenres = true;
        } else {
            changeMode = true;
            proposedGenres = publicGenres;
            currentGenreText = "";
            biographyCollapsed = true;
        }
    }

    async function handleTypeaheadCreationForGenres(event) {
        if (!find(proposedGenres, {text: currentGenreText}) && currentGenreText && currentGenreText.trim() !== "") {
            const uuid = uuidv4();
            await setDoc(doc(db, `genres/${currentGenreText.trim().replaceAll(" ", "-")}-${uuid}`), {
                name: currentGenreText,
                id: `genre/${currentGenreText.trim().replaceAll(" ", "-")}-${uuid}`,
            });
            proposedGenres.push({text: currentGenreText, id: `genre/${currentGenreText.trim().replaceAll(" ", "-")}-${uuid}`});
            proposedGenres = proposedGenres;
            genresForQuerying.push(currentGenreText);
            genresForQuerying = genresForQuerying;
            currentGenreText = "";
            hideTypeaheadCreateForGenres = true;
            autocompleteResultsForGenres = []
        }
    }

    function handleTypeaheadDisplayForGenres(event) {
        if (!find(autocompleteResultsForGenres, {name: currentGenreText.toLowerCase()}) && currentGenreText && currentGenreText.trim() !== "") {
            hideTypeaheadCreateForGenres = false;
        } else {
            hideTypeaheadCreateForGenres = true;
        }
    }

    function handleTypeaheadSelectionForGenres(event) {
        if (!find(proposedGenres, {text: event.detail.text})) {
            proposedGenres.push({text: event.detail.text, id: `genre/${event.detail.id}`});
            proposedGenres = proposedGenres;
            genresForQuerying.push(event.detail.text);
            genresForQuerying = genresForQuerying;
            currentGenreText = "";
            hideTypeaheadCreateForGenres = true;
            autocompleteResultsForGenres = [];
        }
    }
</script>

<Modal header="All genres" bind:hideModal={hideModalGenres}><svelte:fragment slot="body">
    {#each publicGenres as genre}
        <a href="/{genre.id}" class="drop-shadow-xl transition-all hover:-translate-y-[0.10rem] block mt-2 py-1 px-2 text-center bg-slate-700 rounded-lg not-italic text-white">{genre.text}</a>
    {/each}
</svelte:fragment></Modal>

<div class="page mx-6">
    <div class="mt-2 text-sm breadcrumbs">
        <ul>
            <li><a href="/artist/all">Artists</a></li>
            <li>{artistData?.name}</li>
        </ul>
    </div>
    
    <div class="flex justify-between mt-6">
        <div class="header sticky top-6 h-full basis-1/5 flex flex-col justify-center items-center">
            <span class="max-w-[10rem]">
                <span>
                    <img class="rounded-full drop-shadow-xl hover:-translate-y-1 transition-all h-40 w-40 min-h-[10rem] min-w-[10rem]" src={artistData?.images[1]?.url} alt="">
                </span>
                <h2 class="text-2xl break-words text-center font-black mt-4">{artistData?.name}</h2>
            </span>

            <div class="genres z-50 w-3/4 mt-4 text-xs transition-all hover:-translate-y-1 p-4 drop-shadow-xl rounded-lg bg-gray-800">
                <h2 class="italic inline text-gray-400">GENRES</h2>
                <div id="divider" class="w-full bg-gray-700 h-0.5"></div>
                <form action="" on:submit|preventDefault={async () => {
                    await submitProposedDetails();
                    enterChangeMode();

                    if (browser) {
                        location.reload();
                    }
                }}>
                    <p class="italic mt-2 text-gray-400">genre
                        {#if publicGenres.length > 3}
                            <a href="/{publicGenres[0].id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={changeMode}>{publicGenres[0].text}</a>
                            <a href="/{publicGenres[1].id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={changeMode}>{publicGenres[1].text}</a>
                            <a href="/{publicGenres[2].id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={changeMode}>{publicGenres[2].text}</a>
                            <button type="button" class="italic" class:hidden={changeMode} on:click|preventDefault={() => {
                                hideModalGenres = !hideModalGenres;
                            }}>view all</button>
                        {:else}
                            {#each publicGenres as genre}
                                <a href="/{genre.id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={changeMode}>{genre.text}</a>
                            {/each}
                        {/if}

                        {#each proposedGenres as genre}
                            <span class:hidden={!changeMode} class="not-italic text-white p-1 mr-1 bg-slate-700 rounded-lg">
                                <a href="/{genre.id}" class="text-center">{genre.text} </a>
                                <button type="button" on:click|stopPropagation|preventDefault={() => {
                                    remove(proposedGenres, {
                                        text: genre.text,
                                    });
                                    const newArr = genresForQuerying.filter(item => {
                                        return item !== genre.text;
                                    });
                                    proposedGenres = proposedGenres;
                                    genresForQuerying = newArr;
                                }} class="px-2 py-1 ml-1 rounded-full bg-slate-800">x</button>
                            </span>
                        {/each}
                        <InputWithTypeahead collectionType="genres" on:handleTypeaheadCreation={handleTypeaheadCreationForGenres} bind:hideTypeaheadCreate={hideTypeaheadCreateForGenres} {characterRegex} on:handleTypeaheadDisplay={handleTypeaheadDisplayForGenres} bind:currentLabelText={currentGenreText} inChangeMode={changeMode} on:handleTypeaheadSelection={handleTypeaheadSelectionForGenres} bind:autocompleteResults={autocompleteResultsForGenres}/>     
                    </p>
                    <button type="submit" class="rounded-lg px-2 py-1 mt-1 bg-gray-700" class:hidden={!changeMode}>Submit</button>
                </form>
            </div>
            <div class="history w-3/4 mt-4 text-xs transition-all hover:-translate-y-1 p-4 drop-shadow-xl rounded-lg bg-gray-800">
                <h2 class="italic inline text-gray-400">BIOGRAPHY</h2>
                <button class="float-right inline" on:click={() => {
                    biographyCollapsed = !biographyCollapsed;
                }}>Collapse</button>
                
                {#if biographyCollapsed}
                    <div transition:slide>
                        <div id="divider" class="w-full bg-gray-700 h-0.5"></div>
                        {#if changeMode}
                            <form action="" on:submit|preventDefault={async () => {
                                await setDoc(doc(db, `artists/${$page.params.id}`), {
                                    biography: sanitizedBiography,
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
                            <div id="biography">{@html marked(sanitizedBiography)}</div>
                        {/if}
                    </div>
                {/if}
            </div>

            {#if changeMode}
                <div class="social-media-links w-3/4 mt-4 text-xs transition-all hover:-translate-y-1 p-4 drop-shadow-xl rounded-lg bg-gray-800">
                    <h2 class="italic inline text-gray-400">SOCIALS</h2>
                    <div id="divider" class="w-full bg-gray-700 h-0.5"></div>
                    <form action="" on:submit|preventDefault={async () => {
                        await setDoc(doc(db, `artists/${$page.params.id}`), {
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

            {#if !changeMode && (artistData?.twitterHref?.trim() !== "" || artistData?.instagramHref?.trim() !== "" || artistData?.facebookHref?.trim() !== "" || artistData?.youtubeHref?.trim() !== "" || artistData?.websiteHref?.trim() !== "")}
                <div class="socials mt-6 text-xs w-3/4 flex justify-evenly drop-shadow-lg">
                    {#if artistData?.twitterHref}
                        <a class="transition-all hover:-translate-y-[0.10rem]" href="{artistData?.twitterHref}"><Icon data={faTwitter}/></a>
                    {/if}
                    {#if artistData?.instagramHref}
                        <a class="transition-all hover:-translate-y-[0.10rem]" href="{artistData?.instagramHref}"><Icon data={faInstagram}/></a>
                    {/if}
                    {#if artistData?.facebookHref}
                        <a class="transition-all hover:-translate-y-[0.10rem]" href="{artistData?.facebookHref}"><Icon data={faFacebook}/></a>
                    {/if}
                    {#if artistData?.youtubeHref}
                        <a class="transition-all hover:-translate-y-[0.10rem]1" href="{artistData?.youtubeHref}"><Icon data={faYoutube}/></a>
                    {/if}
                    {#if artistData?.websiteHref}
                        <a class="transition-all hover:-translate-y-[0.10rem]" href="{artistData?.websiteHref}"><Icon data={faGlobe}/></a>
                    {/if}
                </div>
            {/if}
            <button class="text-xs my-6 opacity-10 transition-all hover:opacity-100 self-start" on:click={enterChangeMode}>Change</button>
        </div>
        <div class="content basis-4/5 pr-14">
            {#if artistAlbums.length !== 0}
                <div class="flex justify-between">
                    <h2 class="text-4xl font-black mb-4">Albums</h2>
                    {#if artistAlbums.length > 5}
                        <button class="hover:-translate-y-1 transition-all drop-shadow-xl" on:click={() => { showMoreAlbums = !showMoreAlbums; }}>view all</button>
                    {/if}
                </div>
                <div class="albums grid grid-flow-row-dense grid-cols-5 gap-4">
                    {#if artistAlbums.length > 5}
                        {#each artistAlbums.slice(0, 5) as album}
                            <BigTrackThumbnail date={album?.release_date} classes="" href="/album/{album?.id}" src={album?.images[1].url} alt="" title={album?.name} artist={album?.artists[0]?.name}/>
                        {/each}
                    {:else}
                        {#each artistAlbums as album}
                            <BigTrackThumbnail date={album?.release_date} classes="" href="/album/{album?.id}" src={album?.images[1].url} alt="" title={album?.name} artist={album?.artists[0]?.name}/>
                        {/each}
                    {/if}
                </div>
                {#if showMoreAlbums}
                    <div transition:slide class="view-more-albums mt-4 grid grid-flow-rose-dense grid-cols-5 gap-4">
                        {#each artistAlbums.slice(5) as album}
                            <BigTrackThumbnail date={album?.release_date} classes="" href="/album/{album?.id}" src={album?.images[1]?.url} alt="" title={album?.name} artist={album?.artists[0]?.name}/>
                        {/each}
                    </div>
                {/if}
                <div class="divider"></div>
            {/if}
            {#if artistSingles.length !== 0}
                <div class="flex justify-between">
                    <h2 class="text-4xl font-black mb-4">Singles & EPs</h2>
                    {#if artistSingles.length > 5}
                        <button class="hover:-translate-y-1 transition-all drop-shadow-xl" on:click={() => { showMoreSingles = !showMoreSingles; }}>view all</button>
                    {/if}
                </div>
                <div class="singles grid grid-flow-row-dense grid-cols-5 gap-4">
                    {#if artistSingles.length > 5}
                        {#each artistSingles.slice(0, 5) as single}
                            <BigTrackThumbnail date={single?.release_date} classes="" href="/album/{single?.id}" src={single?.images[1]?.url} alt="" title={single?.name} artist={single?.artists[0]?.name}/>
                        {/each}
                    {:else}
                        {#each artistSingles as single}
                            <BigTrackThumbnail date={single?.release_date} classes="" href="/album/{single?.id}" src={single?.images[1]?.url} alt="" title={single?.name} artist={single?.artists[0]?.name}/>
                        {/each}
                    {/if}
                </div>
                {#if showMoreSingles}
                    <div transition:slide class="view-more-singles mt-4 grid grid-flow-rose-dense grid-cols-5 gap-4">
                        {#each artistSingles.slice(5) as single}
                            <BigTrackThumbnail date={single?.release_date} classes="" href="/album/{single?.id}" src={single?.images[1]?.url} alt="" title={single?.name} artist={single?.artists[0]?.name}/>
                        {/each}
                    </div>
                {/if}
                <div class="divider"></div>
            {/if}
            {#if artistAppearances.length !== 0}
                <div class="flex justify-between">
                    <h2 class="text-4xl font-black mb-4">Guest appearances</h2>
                    {#if artistAppearances.length > 5}
                        <button class="hover:-translate-y-1 transition-all drop-shadow-xl" on:click={() => { showMoreAppearances = !showMoreAppearances; }}>view all</button>
                    {/if}
                </div>
                <div class="singles grid grid-flow-row-dense grid-cols-5 gap-4">
                    {#if artistAppearances.length > 5}
                        {#each artistAppearances.slice(0, 5) as single}
                            <BigTrackThumbnail date={single?.release_date} classes="" href="/album/{single?.id}" src={single?.images[1]?.url} alt="" title={single?.name} artist={single?.artists[0]?.name}/>
                        {/each}
                    {:else}
                        {#each artistAppearances as single}
                            <BigTrackThumbnail date={single?.release_date} classes="" href="/album/{single?.id}" src={single?.images[1]?.url} alt="" title={single?.name} artist={single?.artists[0]?.name}/>
                        {/each}
                    {/if}
                </div>
                {#if showMoreAppearances}
                    <div transition:slide class="mt-4 view-more-appearances grid grid-flow-row-dense grid-cols-5 gap-4">
                        {#each artistAppearances.slice(5) as single}
                            <BigTrackThumbnail date={single?.release_date} classes="" href="/album/{single?.id}" src={single?.images[1]?.url} alt="" title={single?.name} artist={single?.artists[0]?.name}/>
                        {/each}
                    </div>
                {/if}
            {/if}
        </div>
    </div>
</div>

<style>
</style>