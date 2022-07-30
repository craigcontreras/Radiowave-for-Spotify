<script>
	import { slide } from 'svelte/transition';
	import { page } from '$app/stores';
    import { browser } from "$app/env";
    import { goto } from "$app/navigation";
    import { collection, doc, getDoc, getDocs, increment, limit, orderBy, query, setDoc, where } from "firebase/firestore";
    import { onMount } from "svelte";
    import { db, auth } from "../../firebase.js";
    import axios from 'axios';
    import Rating from '../../components/Rating.svelte';
    import Icon from 'svelte-awesome';
    import { faPlayCircle } from '@fortawesome/free-solid-svg-icons/faPlayCircle';
    import remove from 'lodash/remove.js';
    import InputWithTypeahead from '../../components/InputWithTypeahead.svelte';
    import find from 'lodash/find.js';
    import { v4 as uuidv4 } from "uuid";
    import Modal from '../../components/Modal.svelte';
    import TrackReview from '../../components/TrackReview.svelte';
    import Comments from '../../components/Comments.svelte';
    import TrackThumbnail from '../../components/thumbnails/TrackThumbnail.svelte';

    let userLoaded = false;
    let albumData;
    let userId = "";

    let hide = false;
    let detailElement;
    let ratingColor = "";

    let releaseDate;
    let inChangeMode = false;

    let currentLabelText = "";
    let hideTypeaheadCreateForLabels = true;
    let autocompleteResultsForLabels = [];
    let publicLabels = [];
    let proposedLabels = [];
    let labelsForQuerying = [];
    let hideModalLabels = true;

    let currentGenreText = "";
    let hideTypeaheadCreateForGenres = true;
    let autocompleteResultsForGenres = [];
    let publicGenres = [];
    let proposedGenres = [];
    let genresForQuerying = [];
    let hideModalGenres = true;

    let currentProducerText = "";
    let hideTypeaheadCreateForProducers = true;
    let autocompleteResultsForProducers = [];
    let publicProducers = [];
    let proposedProducers = [];
    let producersForQuerying = [];
    let hideModalProducers = true;

    let currentWriterText = "";
    let hideTypeaheadCreateForWriters = true;
    let autocompleteResultsForWriters = [];
    let publicWriters = [];
    let proposedWriters = [];
    let writersForQuerying = [];
    let tracks = [];
    let hideModalWriters = true;

    let refreshed = 0;
    let commentCollapsed = true;
    let moreTracksByArtist = [];
    let moreTracks = [];

    let dates = [];
    let views = [];

    let options = {
        chart: {
            type: "line",
            toolbar: {
                show: false,
            },
            zoom: {
                enabled: false,
            },
            height: "85%",
            width: "100%"
        },
        dataLabels: {
            enabled: false,  
        },
        series: [
            {
                name: "views",
                data: views,
            }
        ],
        xaxis: {
            categories: dates
        }
    };
    let chartMethod;
    let chartLoaded;

    const characterRegex = /^([a-zA-Z0-9\s_-]+)$/
    const id = "4d5e942d117f4de793c86a1c53c3d393";

    onMount(async () => {
        loginToFirebase();

        const { chart } = await import("svelte-apexcharts");
        chartMethod = chart;
        chartLoaded = true;

        if (browser) {
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.intersectionRatio < 1) {
                        hide = true;
                    } else {
                        hide = false;
                    }
                });
            }, {
                threshold: 1.0
            });
            observer.observe(detailElement);
        }
    });

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
        const spotifyAlbum = axios.get(`https://api.spotify.com/v1/albums/${$page.params.id}`, {
            headers: {
                Authorization: `Bearer ${userAccessToken}`
            }
        }).then(async (res) => {
            if (res.data.album_type === "single" && res.data.total_tracks < 4) {
                if (browser) {
                    goto("/error");
                }
                return;
            }

            if (refreshed > 1) {
                if (browser) {
                    goto("/error");
                }
                return;
            } else {
                const dates = res.data.release_date.split("-");
                const year = dates[0];
                const month = dates[1];
                const day = dates[2];
                const date = new Date(year, month - 1, day);

                for (let track of res.data.tracks.items) {
                    tracks.push({
                        duration: track.duration_ms,
                        id: track.id,
                        name: track.name,
                        track_number: track.track_number,
                    });
                    tracks = tracks;
                }

                albumData = {
                    album_type: res.data.album_type,
                    total_tracks: res.data.total_tracks,
                    external_urls: res.data.external_urls.spotify,
                    id: res.data.id,
                    images: res.data.images,
                    name: res.data.name,
                    release_date: date,
                    artists: res.data.artists,
                    primary_artist: res.data.artists[0].name,
                    tracks,
                    avgRating: 0,
                    numRatings: 0,
                    year,
                    month,
                    day,
                    label: [],
                    producers: [],
                    writers: [],
                    genre: [],
                    labelNames: [],
                    genreNames: [],
                    producerNames: [],
                    writerNames: [],
                };

                await setDoc(doc(db, `albums/${$page.params.id}`), albumData);
                releaseDate = date;
                publicLabels = albumData?.label;
                labelsForQuerying = albumData?.labelNames;
                publicGenres = albumData?.genre;
                genresForQuerying = albumData?.genreNames;
                publicProducers = albumData?.producers;
                producersForQuerying = albumData?.producerNames;
                publicWriters = albumData?.writers;
                writersForQuerying = albumData?.writerNames;
                findMoreAlbumsByArtist();
                findMoreAlbums();
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

    async function loginToFirebase() {
        const user = await getCurrentUser();
        if (user !== null) {
            userId = user.uid;
            const userDoc = await getDoc(doc(db, `users/${user.uid}`));
            const userAccessToken = userDoc.data().access;
            const userRefreshToken = userDoc.data().refresh;
            const albumDocument = await getDoc(doc(db, `albums/${$page.params.id}`));

            if (!albumDocument.exists()) {
                initialLoad(userAccessToken, userRefreshToken);
            } else {
                albumData = albumDocument.data();
                tracks = albumData?.tracks;
                releaseDate = albumData.release_date.toDate();
                publicLabels = albumData?.label;
                labelsForQuerying = albumData?.labelNames;
                publicGenres = albumData?.genre;
                genresForQuerying = albumData?.genreNames;
                publicProducers = albumData?.producers;
                producersForQuerying = albumData?.producerNames;
                publicWriters = albumData?.writers;
                writersForQuerying = albumData?.writerNames;
                if (albumData?.avgRating >= 0 && albumData?.avgRating < 50) {
                    ratingColor = "bg-red-600";
                } else if (albumData?.avgRating >= 50 && albumData?.avgRating < 70) {
                    ratingColor = "bg-yellow-400";
                } else if (albumData?.avgRating >= 70 && albumData?.avgRating <= 100) {
                    ratingColor = "bg-green-600";
                }
                findMoreAlbumsByArtist();
                findMoreAlbums();
            }
            
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
            const dateObj = new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
            const date = `${dateObj.getFullYear()}-${dateObj.getMonth() + 1}-${dateObj.getDate()}`;
            await setDoc(doc(db, `albums/${$page.params.id}/counter/${date}`), {
                pageViews: increment(1),
                date: dateObj,
            }, {
                merge: true
            });

            await setDoc(doc(db, `statistics/${$page.params.id}`), {
                views: increment(1),
            }, {
                merge: true
            });

            const range = getDaysArray(new Date(dateObj.getTime()).setDate(dateObj.getDate() - 6), dateObj); 
            range.forEach(date => {
                dates.push(`${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`);    
                dates = dates;
                views.push({
                    x: `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`,
                    y: 0
                });
            });

            const counterRef = collection(db, `albums/${$page.params.id}/counter`);
            const counterQuery = query(counterRef, orderBy("date", "asc"), limit(7));
            const counterDocs = await getDocs(counterQuery);

            counterDocs.forEach((doc, index) => {
                remove(views, (obj) => {
                    return obj.x === `${doc.data().date.toDate().getMonth() + 1}/${doc.data().date.toDate().getDate()}/${doc.data().date.toDate().getFullYear()}`;
                })
                views.push({
                    x: `${doc.data().date.toDate().getMonth() + 1}/${doc.data().date.toDate().getDate()}/${doc.data().date.toDate().getFullYear()}`,
                    y: doc.data().pageViews
                });
                // dates.push(`${doc.data().date.toDate().getMonth() + 1}/${doc.data().date.toDate().getDate()}/${doc.data().date.toDate().getFullYear()}`);
            });

            options = {
                chart: {
                    type: "area",
                    toolbar: {
                        show: false,
                    },
                    zoom: {
                        enabled: false,
                    },
                    height: "85%",
                    width: "100%",
                },
                dataLabels: {
                    enabled: false,  
                },
                grid: {
                    show: false,
                },
                yaxis: {
                    axisTicks: {
                        show: false,
                    },
                    labels: {
                        show: false,
                    },
                    forceNiceScale: true,
                },
                xaxis: {
                    tooltip: {
                        enabled: false,
                    },
                    axisTicks: {
                        show: false,
                    }
                },
                stroke: {
                    show: true,
                    curve: "straight",
                    lineCap: "round",
                    width: 4,
                },
                fill: {
                    type: "gradient",
                    gradient: {
                        shadeIntensity: 0.75,
                        opacityFrom: 1,
                        opacityTo: 0.25,
                        stops: [0],
                        type: "vertical",
                    }
                },
                tooltip: {
                    marker: {
                        show: false,
                    },
                    x: {
                        show: false,
                    },
                    theme: "dark"
                },
                series: [
                    {
                        name: "views",
                        data: views,
                    }
                ],
                xaxis: {
                    categories: dates
                }
            };
        } else {
            if (browser) {
                goto("/error");
            }
         }
    }

    function enterChangeMode() {
        if (!inChangeMode) {
            inChangeMode = true;
            proposedLabels = publicLabels;
            proposedGenres = publicGenres;
            proposedProducers = publicProducers;
            proposedWriters = publicWriters;
            currentLabelText = "";
            currentGenreText = "";
            currentProducerText = "";
            currentWriterText = "";
        } else {
            inChangeMode = false;
            hideTypeaheadCreateForLabels = true;
            autocompleteResultsForLabels = [];
            hideTypeaheadCreateForGenres = true;
            autocompleteResultsForGenres = [];
            hideTypeaheadCreateForProducers = true;
            autocompleteResultsForProducers = [];
            hideTypeaheadCreateForWriters = true;
            autocompleteResultsForWriters = [];
        }
    }

    async function submitProposedDetails() {
        await setDoc(doc(db, `albums/${$page.params.id}`), {
            label: proposedLabels,
            genre: proposedGenres,
            producers: proposedProducers,
            writers: proposedWriters,
            labelNames: labelsForQuerying,
            genreNames: genresForQuerying,
            producerNames: producersForQuerying,
            writerNames: writersForQuerying,
        }, {
            merge: true
        });

        return "Changed in Firebase";
    }

    async function handleTypeaheadCreationForLabels(event) {
        if (!find(proposedLabels, {text: currentLabelText}) && currentLabelText && currentLabelText.trim() !== "") {
            const uuid = uuidv4();
            await setDoc(doc(db, `labels/${currentLabelText.trim().replaceAll(" ", "-")}-${uuid}`), {
                name: currentLabelText,
                id: `label/${currentLabelText.trim().replaceAll(" ", "-")}-${uuid}`,
            });
            proposedLabels.push({text: currentLabelText, id: `label/${currentLabelText.trim().replaceAll(" ", "-")}-${uuid}`});
            proposedLabels = proposedLabels;
            labelsForQuerying.push(currentLabelText);
            labelsForQuerying = labelsForQuerying;
            currentLabelText = "";
            hideTypeaheadCreateForLabels = true;
            autocompleteResultsForLabels = []
        }
    }

    function handleTypeaheadDisplayForLabels(event) {
        if (!find(autocompleteResultsForLabels, {name: currentLabelText.toLowerCase()}) && currentLabelText && currentLabelText.trim() !== "") {
            hideTypeaheadCreateForLabels = false;
        } else {
            hideTypeaheadCreateForLabels = true;
        }
    }

    function handleTypeaheadSelectionForLabels(event) {
        if (!find(proposedLabels, {text: event.detail.text})) {
            proposedLabels.push({text: event.detail.text, id: `label/${event.detail.id}`});
            proposedLabels = proposedLabels;
            labelsForQuerying.push(event.detail.text);
            labelsForQuerying = labelsForQuerying;
            currentLabelText = "";
            hideTypeaheadCreateForLabels = true;
            autocompleteResultsForLabels = [];
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

    async function handleTypeaheadCreationForProducers(event) {
        if (!find(proposedProducers, {text: currentProducerText}) && currentProducerText && currentProducerText.trim() !== "") {
            const uuid = uuidv4();
            await setDoc(doc(db, `producers/${currentProducerText.trim().replaceAll(" ", "-")}-${uuid}`), {
                name: currentProducerText,
                id: `producer/${currentProducerText.trim().replaceAll(" ", "-")}-${uuid}`,
            });
            proposedProducers.push({text: currentProducerText, id: `producer/${currentProducerText.trim().replaceAll(" ", "-")}-${uuid}`});
            proposedProducers = proposedProducers;
            producersForQuerying.push(currentProducerText);
            producersForQuerying = producersForQuerying;
            currentProducerText = "";
            hideTypeaheadCreateForProducers = true;
            autocompleteResultsForProducers = []
        }
    }

    function handleTypeaheadDisplayForProducers(event) {
        if (!find(autocompleteResultsForProducers, {name: currentProducerText.toLowerCase()}) && currentProducerText && currentProducerText.trim() !== "") {
            hideTypeaheadCreateForProducers = false;
        } else {
            hideTypeaheadCreateForProducers = true;
        }
    }

    function handleTypeaheadSelectionForProducers(event) {
        if (!find(proposedProducers, {text: event.detail.text})) {
            proposedProducers.push({text: event.detail.text, id: `producer/${event.detail.id}`});
            proposedProducers = proposedProducers;
            producersForQuerying.push(event.detail.text);
            producersForQuerying = producersForQuerying;
            currentProducerText = "";
            hideTypeaheadCreateForProducers = true;
            autocompleteResultsForProducers = [];
        }
    }

    async function handleTypeaheadCreationForWriters(event) {
        if (!find(proposedWriters, {text: currentWriterText}) && currentWriterText && currentWriterText.trim() !== "") {
            const uuid = uuidv4();
            await setDoc(doc(db, `writers/${currentWriterText.trim().replaceAll(" ", "-")}-${uuid}`), {
                name: currentWriterText,
                id: `writer/${currentWriterText.trim().replaceAll(" ", "-")}-${uuid}`,
            });
            proposedWriters.push({text: currentWriterText, id: `writer/${currentWriterText.trim().replaceAll(" ", "-")}-${uuid}`});
            proposedWriters = proposedWriters;
            writersForQuerying.push(currentWriterText);
            writersForQuerying = writersForQuerying;
            currentWriterText = "";
            hideTypeaheadCreateForWriters = true;
            autocompleteResultsForWriters = []
        }
    }

    function handleTypeaheadDisplayForWriters(event) {
        if (!find(autocompleteResultsForWriters, {name: currentWriterText.toLowerCase()}) && currentWriterText && currentWriterText.trim() !== "") {
            hideTypeaheadCreateForWriters = false;
        } else {
            hideTypeaheadCreateForWriters = true;
        }
    }

    function handleTypeaheadSelectionForWriters(event) {
        if (!find(proposedWriters, {text: event.detail.text})) {
            proposedWriters.push({text: event.detail.text, id: `writer/${event.detail.id}`});
            proposedWriters = proposedWriters;
            writersForQuerying.push(event.detail.text);
            writersForQuerying = writersForQuerying;
            currentWriterText = "";
            hideTypeaheadCreateForWriters = true;
            autocompleteResultsForWriters = [];
        }
    }

    function millisToMinutesAndSeconds(millis) {
        var minutes = Math.floor(millis / 60000);
        var seconds = ((millis % 60000) / 1000).toFixed(0);
        return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
    }

    async function findMoreAlbumsByArtist() {
        const tracksByArtistRef = collection(db, `albums`);
        const tracksByArtistQuery = query(tracksByArtistRef, where("primary_artist", "==", albumData?.artists[0]?.name), where("name", "!=", albumData?.name), limit(10));
        const tracksByArtist = await getDocs(tracksByArtistQuery);
        tracksByArtist.forEach(doc => {
            moreTracksByArtist.push({
                name: doc.data().name,
                artists: doc.data().artists,
                image: doc.data().images[1].url,
                id: doc.id,
            });
            moreTracksByArtist = moreTracksByArtist;
        });
    }

    async function findMoreAlbums() {
        const recentTracksRef = collection(db, `albums`);
        const recentTracksQuery = query(recentTracksRef, orderBy("avgRating", "desc"), limit(12));
        const recentTracks = await getDocs(recentTracksQuery);
        recentTracks.forEach(doc => {
            moreTracks.push({
                name: doc.data().name,
                artists: doc.data().artists,
                image: doc.data().images[1].url,
                id: doc.id,
            });
            moreTracks = moreTracks;
        });
    }


    const getDaysArray = function (start, end) {
        for (var arr = [], dt = new Date(start); dt <= new Date(end); dt.setDate(dt.getDate() + 1)) {
            arr.push(new Date(dt));
        }

        return arr;
    }
</script>

<Modal header="All labels" bind:hideModal={hideModalLabels}><svelte:fragment slot="body">
    {#each publicLabels as label}
        <a href="/{label.id}" class="drop-shadow-xl transition-all hover:-translate-y-[0.10rem] block mt-2 py-1 px-2 text-center bg-slate-700 rounded-lg not-italic text-white">{label.text}</a>
    {/each}
</svelte:fragment></Modal>

<Modal header="All genres" bind:hideModal={hideModalGenres}><svelte:fragment slot="body">
    {#each publicGenres as genre}
        <a href="/{genre.id}" class="drop-shadow-xl transition-all hover:-translate-y-[0.10rem] block mt-2 py-1 px-2 text-center bg-slate-700 rounded-lg not-italic text-white">{genre.text}</a>
    {/each}
</svelte:fragment></Modal>

<Modal header="All writers" bind:hideModal={hideModalWriters}><svelte:fragment slot="body">
    {#each publicWriters as writer}
        <a href="/{writer.id}" class="drop-shadow-xl transition-all hover:-translate-y-[0.10rem] block mt-2 py-1 px-2 text-center bg-slate-700 rounded-lg not-italic text-white">{writer.text}</a>
    {/each}
</svelte:fragment></Modal>

<Modal header="All producers" bind:hideModal={hideModalProducers}><svelte:fragment slot="body">
    {#each publicProducers as producer}
        <a href="/{producer.id}" class="drop-shadow-xl transition-all hover:-translate-y-[0.10rem] block mt-2 py-1 px-2 text-center bg-slate-700 rounded-lg not-italic text-white">{producer.text}</a>
    {/each}
</svelte:fragment></Modal>

<div class="mx-6 mt-2 text-sm breadcrumbs">
    <ul>
        <li><a href="/album/top/{new Date().getFullYear()}">Albums</a></li>
        <li>{albumData?.name}</li>
    </ul>
</div>

<div class="mx-6 content">
    <div bind:this={detailElement} class:-z-50={hide} class="header flex sticky top-[-1px] justify-start">
        <img on:load={() => {
            // const colorThief = new ColorThief();
            // const color = colorThief.getColor(thumbnailElement, 10);
            // console.log(color);
        }} class:opacity-20={hide} class:scale-50={hide} class="max-h-[300px] min-h-[300px] max-w-[300px] min-w-[300px] origin-top-left transition-all hover:opacity-100 rounded-lg outline-4 drop-shadow-xl my-6 mr-6" src={albumData?.images[1]?.url} alt="Album cover"/>
        <div class:opacity-0={hide} class:pointer-events-none={hide} class="transition-opacity flex w-full content">
            <div class="text my-8 basis-3/5">
                <h1 class="text-6xl font-black max-w-[90%]">{albumData?.name}</h1>
                <h2 class="text-4xl font-bold max-w-[90%]">by <a class="hover:underline" href="/artist/{albumData?.artists[0]?.id}">{albumData?.artists[0]?.name}</a></h2>

                <div class="w-16 mt-4">
                    <Rating bind:ratingColor={ratingColor} avgRating={albumData?.avgRating}/>
                </div>

                {#if albumData?.numRatings === 1}
                    <p class="my-1 mb-6 italic">based on {albumData?.numRatings} rating</p>
                {:else}
                    <p class="my-1 mb-6 italic">based on {albumData?.numRatings} ratings</p>
                {/if}

                <a class="text-lg rounded-lg drop-shadow-all hover:-translate-y-1 hover-all px-4 py-2 bg-slate-700" href={albumData?.external_urls}><Icon class="mr-2" data={faPlayCircle}/>Listen to {albumData?.name} on Spotify</a>
            </div>
            <div class="details my-8 mr-6 float-right basis-2/5">
                <div class="text-sm transition-all hover:-translate-y-1 p-4 drop-shadow-xl rounded-lg bg-gray-800 detail-box">
                    <h2 class="italic inline text-gray-400">TRACK DETAILS</h2>
                    <button class="float-right inline" on:click={enterChangeMode}>Change</button>
                    <div class="w-full bg-gray-700 h-0.5"></div>
                    <p><span class="italic text-gray-400 pr-1">date</span> {releaseDate?.getUTCFullYear()}-{releaseDate?.getUTCMonth() + 1}-{releaseDate?.getUTCDate()}</p>
                    <form action="" on:submit|preventDefault={async () => {
                        await submitProposedDetails();
                        enterChangeMode();

                        if (browser) {
                            location.reload();
                        }
                    }}>
                        <p class="italic text-gray-400">label
                            {#if publicLabels.length > 3}
                                <a href="/{publicLabels[0].id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={inChangeMode}>{publicLabels[0].text}</a>
                                <a href="/{publicLabels[1].id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={inChangeMode}>{publicLabels[1].text}</a>
                                <a href="/{publicLabels[2].id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={inChangeMode}>{publicLabels[2].text}</a>
                                <button type="button" class="italic" class:hidden={inChangeMode} on:click|preventDefault={() => {
                                    hideModalLabels = !hideModalLabels;
                                }}>view all</button>
                            {:else}
                                {#each publicLabels as label}
                                    <a href="/{label.id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={inChangeMode}>{label.text}</a>
                                {/each}
                            {/if}

                            {#each proposedLabels as label}
                                <span class:hidden={!inChangeMode} class="not-italic text-white p-1 mr-1 bg-slate-700 rounded-lg">
                                    <a href="/{label.id}" class="text-center">{label.text} </a>
                                    <button type="button" on:click|stopPropagation|preventDefault={() => {
                                        remove(proposedLabels, {
                                            text: label.text,
                                        });
                                        const newArr = labelsForQuerying.filter(item => {
                                            return item !== label.text;
                                        });
                                        proposedLabels = proposedLabels;
                                        labelsForQuerying = newArr;
                                    }} class="px-2 py-1 ml-1 rounded-full bg-slate-800">x</button>
                                </span>
                            {/each}
                            <InputWithTypeahead collectionType="labels" on:handleTypeaheadCreation={handleTypeaheadCreationForLabels} bind:hideTypeaheadCreate={hideTypeaheadCreateForLabels} {characterRegex} on:handleTypeaheadDisplay={handleTypeaheadDisplayForLabels} bind:currentLabelText={currentLabelText} {inChangeMode} on:handleTypeaheadSelection={handleTypeaheadSelectionForLabels} bind:autocompleteResults={autocompleteResultsForLabels}/>
                        </p>
                        <p class="italic text-gray-400">genre
                            {#if publicGenres.length > 3}
                                <a href="/{publicGenres[0].id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={inChangeMode}>{publicGenres[0].text}</a>
                                <a href="/{publicGenres[1].id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={inChangeMode}>{publicGenres[1].text}</a>
                                <a href="/{publicGenres[2].id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={inChangeMode}>{publicGenres[2].text}</a>
                                <button type="button" class="italic" class:hidden={inChangeMode} on:click|preventDefault={() => {
                                    hideModalGenres = !hideModalGenres;
                                }}>view all</button>
                            {:else}
                                {#each publicGenres as genre}
                                    <a href="/{genre.id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={inChangeMode}>{genre.text}</a>
                                {/each}
                            {/if}

                            {#each proposedGenres as genre}
                                <span class:hidden={!inChangeMode} class="not-italic text-white p-1 mr-1 bg-slate-700 rounded-lg">
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
                            <InputWithTypeahead collectionType="genres" on:handleTypeaheadCreation={handleTypeaheadCreationForGenres} bind:hideTypeaheadCreate={hideTypeaheadCreateForGenres} {characterRegex} on:handleTypeaheadDisplay={handleTypeaheadDisplayForGenres} bind:currentLabelText={currentGenreText} {inChangeMode} on:handleTypeaheadSelection={handleTypeaheadSelectionForGenres} bind:autocompleteResults={autocompleteResultsForGenres}/>
                        </p>
                        <p class="italic text-gray-400">producers
                            {#if publicProducers.length > 3}
                                <a href="/{publicProducers[0].id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={inChangeMode}>{publicProducers[0].text}</a>
                                <a href="/{publicProducers[1].id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={inChangeMode}>{publicProducers[1].text}</a>
                                <a href="/{publicProducers[2].id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={inChangeMode}>{publicProducers[2].text}</a>
                                <button type="button" class="italic" class:hidden={inChangeMode} on:click|preventDefault={() => {
                                    hideModalProducers = !hideModalProducers;
                                }}>view all</button>
                            {:else}
                                {#each publicProducers as producer}
                                    <a href="/{producer.id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={inChangeMode}>{producer.text}</a>
                                {/each}
                            {/if}

                            {#each proposedProducers as producer}
                                <span class:hidden={!inChangeMode} class="not-italic text-white p-1 mr-1 bg-slate-700 rounded-lg">
                                    <a href="/{producer.id}" class="text-center">{producer.text} </a>
                                    <button type="button" on:click|stopPropagation|preventDefault={() => {
                                        remove(proposedProducers, {
                                            text: producer.text,
                                        });
                                        const newArr = producersForQuerying.filter(item => {
                                            return item !== producer.text;
                                        });
                                        proposedProducers = proposedProducers;
                                        producersForQuerying = newArr;
                                    }} class="px-2 py-1 ml-1 rounded-full bg-slate-800">x</button>
                                </span>
                            {/each}
                            <InputWithTypeahead collectionType="producers" on:handleTypeaheadCreation={handleTypeaheadCreationForProducers} bind:hideTypeaheadCreate={hideTypeaheadCreateForProducers} {characterRegex} on:handleTypeaheadDisplay={handleTypeaheadDisplayForProducers} bind:currentLabelText={currentProducerText} {inChangeMode} on:handleTypeaheadSelection={handleTypeaheadSelectionForProducers} bind:autocompleteResults={autocompleteResultsForProducers}/>
                        </p>
                        <p class="italic text-gray-400">writers
                            {#if publicWriters.length > 3}
                                <a href="/{publicWriters[0].id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={inChangeMode}>{publicWriters[0].text}</a>
                                <a href="/{publicWriters[1].id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={inChangeMode}>{publicWriters[1].text}</a>
                                <a href="/{publicWriters[2].id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={inChangeMode}>{publicWriters[2].text}</a>
                                <button type="button" class="italic" class:hidden={inChangeMode} on:click|preventDefault={() => {
                                    hideModalWriters = !hideModalWriters;
                                }}>view all</button>
                            {:else}
                                {#each publicWriters as writer}
                                    <a href="/{writer.id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={inChangeMode}>{writer.text}</a>
                                {/each}
                            {/if}

                            {#each proposedWriters as writer}
                                <span class:hidden={!inChangeMode} class="not-italic text-white p-1 mr-1 bg-slate-700 rounded-lg">
                                    <a href="/{writer.id}" class="text-center">{writer.text} </a>
                                    <button type="button" on:click|stopPropagation|preventDefault={() => {
                                        remove(proposedWriters, {
                                            text: writer.text,
                                        });
                                        const newArr = writersForQuerying.filter(item => {
                                            return item !== writer.text;
                                        });
                                        proposedWriters = proposedWriters;
                                        writersForQuerying = newArr;
                                    }} class="px-2 py-1 ml-1 rounded-full bg-slate-800">x</button>
                                </span>
                            {/each}
                            <InputWithTypeahead collectionType="writers" on:handleTypeaheadCreation={handleTypeaheadCreationForWriters} bind:hideTypeaheadCreate={hideTypeaheadCreateForWriters} {characterRegex} on:handleTypeaheadDisplay={handleTypeaheadDisplayForWriters} bind:currentLabelText={currentWriterText} {inChangeMode} on:handleTypeaheadSelection={handleTypeaheadSelectionForWriters} bind:autocompleteResults={autocompleteResultsForWriters}/>
                        </p>
                        <button type="submit" class="rounded-lg px-2 py-1 mt-1 bg-gray-700" class:hidden={!inChangeMode}>Submit</button>
                    </form>
                </div>
                {#if chartLoaded}
                    <div transition:slide class="graph mt-6 flex flex-col justify-end items-end">
                        <p class="font-bold text-right max-w-[90%]">Popularity of {albumData?.name} in the past week</p>
                        <div class="" use:chartMethod={options}></div>
                    </div>
                {/if}    
            </div>
        </div>
    </div>
    <div class="divider"></div>
    <div class="tracks">
        <h2 class="text-4xl font-black mb-4">Tracks</h2>
        {#each tracks as track}
            <a class="hover:bg-base-300 p-4 transition-all track flex justify-between" href="/track/{track.id}">
                <p class="text-gray-400">{track.track_number} <span class="ml-4 text-white">{track.name}</span></p>
                <p class="text-gray-400">{millisToMinutesAndSeconds(track.duration)}</p>
            </a>
        {/each}    
    </div>
    <div class="divider"></div>
    <div class="reviews">
        <h2 class="text-4xl font-black">Reviews</h2>
        {#if albumData?.numRatings === 1}
            <h3 class="text-2xl font-bold">{albumData?.numRatings} review</h3>
        {:else}
            <h3 class="text-2xl font-bold">{albumData?.numRatings} reviews</h3>
        {/if}
        <TrackReview fromDoc="albums/{$page.params.id}/reviews/{userId}" fromCollection="albums/{$page.params.id}/reviews" commentHref="/album/reviews/{$page.params.id}/" likeDoc="albums/{$page.params.id}/reviews/" trackId={$page.params.id} trackName={albumData?.name} trackAuthor={albumData?.artists[0]?.name} trackHref={albumData?.images[1]?.url} {userId}/>    
    </div>
    <div class="divider"></div>
    <div class="shoutbox">
        <h2 class="text-4xl align-middle font-black inline">Shoutbox</h2>
        <button class="ml-4 px-2 py-1 bg-slate-700 hover:-translate-y-1 drop-shadow-xl rounded-lg transition-all" on:click={() => { commentCollapsed = !commentCollapsed }}>collapse</button>
        {#if !commentCollapsed}
            <div class="mt-4" transition:slide>
                <Comments fromCollection={`albums/${$page.params.id}/comments`} fromDoc={`albums/${$page.params.id}/comments/${uuidv4()}`}/>
            </div>
        {/if}
    </div>
    {#if moreTracksByArtist.length !== 0}
        <div class="divider"></div>
        <div class="more-albums-by-artist">
            <h2 class="text-4xl font-black mb-4">More albums by {albumData?.artists[0]?.name}</h2>
            <div class="w-full h-full overflow-y-visible whitespace-nowrap overflow-x-auto fade-in-left-right">
                {#each moreTracksByArtist as track}
                    <TrackThumbnail classes="!whitespace-normal mr-1" href="/album/{track.id}" src={track.image} alt="" title={track.name} artist={track.artists[0].name}/>
                {/each}
            </div>
        </div>
    {/if}
    {#if moreTracks.length !== 0}
        <div class="divider"></div>
        <div class="more-albums">
            <h2 class="text-4xl font-black mb-4">More albums</h2>
            <div class="w-full h-full overflow-y-visible whitespace-nowrap overflow-x-auto fade-in-left-right">
                {#each moreTracks as track}
                    <TrackThumbnail classes="!whitespace-normal mr-1" href="/album/{track.id}" src={track.image} alt="" title={track.name} artist={track.artists[0].name}/>
                {/each}
            </div>
        </div>
    {/if}
</div>

<style>

</style>