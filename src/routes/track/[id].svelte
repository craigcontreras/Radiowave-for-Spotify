<script>
    import TrackThumbnail from './../../components/thumbnails/TrackThumbnail.svelte';
	import Modal from './../../components/Modal.svelte';
	import InputWithTypeahead from './../../components/InputWithTypeahead.svelte';
	import Rating from './../../components/Rating.svelte';
    import TrackReview from "../../components/TrackReview.svelte";
    import find from "lodash/find.js";
    import remove from "lodash/remove.js";
    import { page } from "$app/stores";
	import axios from 'axios';
	import { goto } from '$app/navigation';
	import { browser } from '$app/env';
    import { collection, doc, getDoc, getDocs, setDoc, query, orderBy, limit, where, updateDoc, increment } from "firebase/firestore";
    import { onMount } from "svelte";
    import { auth, db } from "../../firebase.js";
    import { v4 as uuidv4 } from "uuid";
    import Icon from "svelte-awesome";
    import { faPlayCircle } from '@fortawesome/free-solid-svg-icons/faPlayCircle';
    import Comments from '../../components/Comments.svelte';
    import { slide } from "svelte/transition";

    let userLoaded = false;
    let inChangeMode = false;
    let userId = "";
    let key = "N/A";
    let danceability = "N/A";
    let energy = "N/A";
    let valence = "N/A";
    let releaseDate;

    //handling track details
    
    //only shown in change mode
    let proposedLabels = [];
    let proposedGenre = [];
    let proposedProducers = [];
    let proposedWriters = [];

    let currentLabelText = "";
    let currentGenreText = "";
    let currentProducerText = "";
    let currentWriterText = "";

    let hideTypeaheadCreateForLabels = true;
    let hideTypeaheadCreateForGenres = true;
    let hideTypeaheadCreateForProducers = true;
    let hideTypeaheadCreateForWriters = true;

    let autocompleteResultsForLabels = [];
    let autocompleteResultsForGenres = [];
    let autocompleteResultsForProducers = [];
    let autocompleteResultsForWriters = [];

    //public
    let publicLabels = [];
    let publicGenre = [];
    let publicProducers = [];
    let publicWriters = [];

    let hideModalLabels = true;
    let hideModalGenres = true;
    let hideModalProducers = true;
    let hideModalWriters = true;

    let duration = "";
    let trackData = {};
    let views = [];
    let dates = [];
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
    let chartLoaded = false;

    const characterRegex = /^([a-zA-Z0-9\s_-]+)$/

    //svelte binding elements for dom
    let detailElement;
    let thumbnailElement;

    //intersection observer shit
    let hide = false;

    let moreTracks = [];
    let moreTracksByArtist = [];

    //recommendations
    let genresForRecommendations = [];
    let labelsForQuerying = [];
    let writersForQuerying = [];
    let producersForQuerying = [];
    let recommendedTracks = [];

    let userActivity = [];
    let commentCollapsed = true;
    
    let ratingColor = "";

    let refreshed = 0;
    const id = "4d5e942d117f4de793c86a1c53c3d393";

    let showGraph = false;

    onMount(async () => {
        const { chart } = await import("svelte-apexcharts");
        chartMethod = chart;
        chartLoaded = true;

        loginToFirebase();
        //for the detail element changing position
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
    
    async function initialLoad(userAccessToken, userRefreshToken) {
        if (refreshed > 1) {
            goto("/error");
            return;
        }

        const trackPage = axios.get(`https://api.spotify.com/v1/tracks/${$page.params.id}`, {
            headers: {
                Authorization: `Bearer ${userAccessToken}`
            }
        });
        const trackFeatures = axios.get(`https://api.spotify.com/v1/audio-features/${$page.params.id}`, {
            headers: {
                Authorization: `Bearer ${userAccessToken}`
            }
        });
        axios.all([trackPage, trackFeatures]).then(axios.spread(async (...res) => {
            const trackPageData = res[0];
            const trackFeaturesData = res[1];
            const date = new Date(trackPageData.data.album.release_date);
            const spotifyData = {
                album: {
                    album_type: trackPageData.data.album.album_type,
                    images: trackPageData.data.album.images,
                    name: trackPageData.data.album.name,
                    artists: trackPageData.data.album.artists,
                    release_date: date,
                    id: trackPageData.data.album.id,
                    external_urls: trackPageData.data.album.external_urls.spotify,
                    total_tracks: trackPageData.data.album.total_tracks,
                },
                analysis: {
                    tempo: trackFeaturesData.data.tempo,
                    time_signature: trackFeaturesData.data.time_signature,
                    key: trackFeaturesData.data.key,
                },
                features: {
                    loudness: trackFeaturesData.data.loudness,
                    acousticness: trackFeaturesData.data.acousticness,
                    danceability: trackFeaturesData.data.danceability,
                    energy: trackFeaturesData.data.energy,
                    valence: trackFeaturesData.data.valence,
                },
                duration_ms: trackPageData.data.duration_ms,
                name: trackPageData.data.name,
                track_number: trackPageData.data.track_number,
                avgRating: 0,
                numRatings: 0,
                primary_artist: trackPageData.data.album.artists[0].name,
                label: [],
                producers: [],
                writers: [],
                genre: [],
                labelNames: [],
                genreNames: [],
                producerNames: [],
                writerNames: [],
                year: date.getFullYear() || 0,
                month: date.getMonth() || 0,
                day: date.getDate() || 0,
            };

            await setDoc(doc(db, `tracks/${$page.params.id}`), spotifyData);
            trackData = spotifyData;
            matchKey();
            matchDanceability();
            matchEnergy();
            matchValence();
            duration = millisToMinutesAndSeconds(trackData?.duration_ms);
            publicLabels = trackData?.label;
            publicGenre = trackData?.genre;
            publicProducers = trackData?.producers;
            publicWriters = trackData?.writers;
            genresForRecommendations = trackData?.genreNames;
            releaseDate = new Date(trackData?.album?.release_date);

            const tracksByArtistRef = collection(db, `tracks`);
            const tracksByArtistQuery = query(tracksByArtistRef, where("primary_artist", "==", trackData?.album?.artists[0]?.name), where("name", "!=", trackData?.name), limit(20));
            const tracksByArtist = await getDocs(tracksByArtistQuery);
            tracksByArtist.forEach(doc => {
                moreTracksByArtist.push({
                    name: doc.data().name,
                    artists: doc.data().album.artists,
                    image: doc.data().album.images[1].url,
                    id: doc.id,
                });
                moreTracksByArtist = moreTracksByArtist;
            });
            findRecommendations();
            findUserActivity();
        })).catch(err => {
            if (err?.response?.status === 400) {
                if (browser) {
                    goto("/error");
                }
                return;
            }
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
            const trackDoc = await getDoc(doc(db, `tracks/${$page.params.id}`));

            if (!trackDoc.exists()) {
                initialLoad(userAccessToken, userRefreshToken);
            } else {
                trackData = trackDoc.data();
                matchKey();
                matchDanceability();
                matchEnergy();
                matchValence();
                duration = millisToMinutesAndSeconds(trackData?.duration_ms);
                publicLabels = trackData?.label;
                publicGenre = trackData?.genre;
                publicWriters = trackData?.writers;
                publicProducers = trackData?.producers;
                genresForRecommendations = trackData?.genreNames;
                labelsForQuerying = trackData?.labelNames;
                writersForQuerying = trackData?.writerNames;
                producersForQuerying = trackData?.producerNames;
                releaseDate = trackData?.album?.release_date.toDate();

                const tracksByArtistRef = collection(db, `tracks`);
                const tracksByArtistQuery = query(tracksByArtistRef, where("primary_artist", "==", trackData?.album?.artists[0]?.name), where("name", "!=", trackData?.name), limit(20));
                const tracksByArtist = await getDocs(tracksByArtistQuery);
                tracksByArtist.forEach(doc => {
                    moreTracksByArtist.push({
                        name: doc.data().name,
                        artists: doc.data().album.artists,
                        image: doc.data().album.images[1].url,
                        id: doc.id,
                    });
                    moreTracksByArtist = moreTracksByArtist;
                });
                findRecommendations();
                findUserActivity();
            }
            
            const recentTracksRef = collection(db, `tracks`);
            const recentTracksQuery = query(recentTracksRef, orderBy("avgRating", "desc"), limit(20));
            const recentTracks = await getDocs(recentTracksQuery);
            recentTracks.forEach(doc => {
                moreTracks.push({
                    name: doc.data().name,
                    artists: doc.data().album.artists,
                    image: doc.data().album.images[1].url,
                    id: doc.id,
                });
                moreTracks = moreTracks;
            });

            if (trackData?.avgRating >= 0 && trackData?.avgRating < 50) {
                ratingColor = "bg-red-600";
            } else if (trackData?.avgRating >= 50 && trackData?.avgRating < 70) {
                ratingColor = "bg-yellow-400";
            } else if (trackData?.avgRating >= 70 && trackData?.avgRating <= 100) {
                ratingColor = "bg-green-600";
            }

            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
            const dateObj = new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
            const date = `${dateObj.getFullYear()}-${dateObj.getMonth() + 1}-${dateObj.getDate()}`;
            await setDoc(doc(db, `tracks/${$page.params.id}/counter/${date}`), {
                pageViews: increment(1),
                date: dateObj,
            }, {
                merge: true
            });

            const counterRef = collection(db, `tracks/${$page.params.id}/counter`);
            const counterQuery = query(counterRef, orderBy("date", "asc"), limit(7));
            const counterDocs = await getDocs(counterQuery);

            const range = getDaysArray(new Date(dateObj.getTime()).setDate(dateObj.getDate() - 6), dateObj); 
            range.forEach(date => {
                dates.push(`${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`);    
                dates = dates;
                views.push({
                    x: `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`,
                    y: 0
                });
            });

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

    function matchKey() {
        switch (trackData?.analysis?.time_signature) {
            case 0:
                key = "C";
                break;
            case 1:
                key = "C♯";
                break;
            case 2:
                key = "D";
                break;
            case 3:
                key = "D♯";
                break;
            case 4:
                key = "E";
                break;
            case 5:
                key = "F";
                break;
            case 6:
                key = "F♯";
                break;
            case 7:
                key = "G";
                break;
            case 8:
                key = "G♯";
                break;
            case 9:
                key = "A";
                break;
            case 10:
                key = "A♯";
                break;
            case 11:
                key = "B";
                break;
        }
    }

    function matchDanceability() {
        let danceabilityInt = trackData?.features?.danceability;
        if (danceabilityInt > 0 && danceabilityInt < 0.25) {
            danceability = "Not really danceable";
        } else if (danceabilityInt >= 0.25 && danceabilityInt < 0.50) {
            danceability = "Sorta danceable";
        } else if (danceabilityInt >= 0.50 && danceabilityInt < 0.75) {
            danceability = "Danceable";
        } else if (danceabilityInt >= 0.75 && danceabilityInt <= 1.00) {
            danceability = "Very danceable";
        }
    }

    function matchEnergy() {
        let energyInt = trackData?.features?.energy;
        if (energyInt > 0 && energyInt < 0.25) {
            energy = "Zzzzzzz...";
        } else if (energyInt >= 0.25 && energyInt < 0.50) {
            energy = "Meh...";
        } else if (energyInt >= 0.50 && energyInt < 0.75) {
            energy = "Energetic";
        } else if (energyInt >= 0.75 && energyInt <= 1.00) {
            energy = "Moshpit";
        }
    }

    function matchValence() {
        let valenceInt = trackData?.features?.valence;
        if (valenceInt > 0 && valenceInt < 0.25) {
            valence = "I need therapy type sad";
        } else if (valenceInt >= 0.25 && valenceInt < 0.50) {
            valence = "Sad boy hours";
        } else if (valenceInt >= 0.50 && valenceInt < 0.75) {
            valence = "Happy";
        } else if (valenceInt >= 0.75 && valenceInt <= 1.00) {
            valence = "Pretty happy";
        }
    }

    function enterChangeMode() {
        if (!inChangeMode) {
            inChangeMode = true;
            proposedLabels = publicLabels;
            proposedGenre = publicGenre;
            proposedWriters = publicWriters;
            proposedProducers = publicProducers;
            currentLabelText = "";
            currentGenreText = "";
            currentProducerText = "";
            currentWriterText = "";
        } else {
            inChangeMode = false;
            hideTypeaheadCreateForLabels = true;
            hideTypeaheadCreateForGenres = true;
            hideTypeaheadCreateForProducers = true;
            hideTypeaheadCreateForWriters = true;
            autocompleteResultsForLabels = [];
            autocompleteResultsForGenres = [];
            autocompleteResultsForProducers = [];
            autocompleteResultsForWriters = [];
        }
    }

    async function submitProposedDetails() {
        await setDoc(doc(db, `tracks/${$page.params.id}`), {
            label: proposedLabels,
            genre: proposedGenre,
            genreNames: genresForRecommendations,
            labelNames: labelsForQuerying,
            writerNames: writersForQuerying,
            producerNames: producersForQuerying,
            producers: proposedProducers,
            writers: proposedWriters,
        }, {
            merge: true
        });
        return "Changed in Firebase";
    }

    function millisToMinutesAndSeconds(millis) {
        var minutes = Math.floor(millis / 60000);
        var seconds = ((millis % 60000) / 1000).toFixed(0);
        return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
    }

    function handleTypeaheadDisplayForLabels() {
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

    async function handleTypeaheadCreationForLabels(event) {
        if (!find(proposedLabels, {text: currentLabelText}) && currentLabelText && currentLabelText.trim() !== "") {
            const uuid = uuidv4();
            await setDoc(doc(db, `labels/${currentLabelText.trim().replaceAll(" ", "-")}-${uuid}`), {
                name: currentLabelText,
                id: `label/${currentLabelText.trim().replaceAll(" ", "-")}-${uuid}`
            });
            proposedLabels.push({text: currentLabelText, id: `label/${currentLabelText.trim().replaceAll(" ", "-")}-${uuid}`});
            proposedLabels = proposedLabels;
            labelsForQuerying.push(currentLabelText);
            labelsForQuerying = labelsForQuerying;
            currentLabelText = "";
            hideTypeaheadCreateForLabels = true;
            autocompleteResultsForLabels = [];
        }
    }

    function handleTypeaheadDisplayForGenres() {
        if (!find(autocompleteResultsForGenres, {name: currentGenreText.toLowerCase()}) && currentGenreText && currentGenreText.trim() !== "") {
            hideTypeaheadCreateForGenres = false;
        } else {
            hideTypeaheadCreateForGenres = true;
        }
    }

    function handleTypeaheadSelectionForGenres(event) {
        if (!find(proposedGenre, {text: event.detail.text})) {
            proposedGenre.push({text: event.detail.text, id: `genre/${event.detail.id}`});
            genresForRecommendations.push(event.detail.text);
            proposedGenre = proposedGenre;
            genresForRecommendations = genresForRecommendations;
            currentGenreText = "";
            hideTypeaheadCreateForGenres = true;
            autocompleteResultsForGenres = [];
        }
    }

    async function handleTypeaheadCreationForGenres(event) {
        if (!find(proposedGenre, {text: currentGenreText}) && currentGenreText && currentGenreText.trim() !== "") {
            const uuid = uuidv4();
            await setDoc(doc(db, `genres/${currentGenreText.trim().replaceAll(" ", "-")}-${uuid}`), {
                name: currentGenreText,
                id: `genre/${currentGenreText.trim().replaceAll(" ", "-")}-${uuid}`
            });
            proposedGenre.push({text: currentGenreText, id: `genre/${currentGenreText.trim().replaceAll(" ", "-")}-${uuid}`});
            genresForRecommendations.push(currentGenreText);
            proposedGenre = proposedGenre;
            genresForRecommendations = genresForRecommendations;
            currentGenreText = "";
            hideTypeaheadCreateForGenres = true;
            autocompleteResultsForGenres = [];
        }
    }

    function handleTypeaheadDisplayForProducers() {
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

    async function handleTypeaheadCreationForProducers(event) {
        if (!find(proposedProducers, {text: currentProducerText}) && currentProducerText && currentProducerText.trim() !== "") {
            const uuid = uuidv4();
            await setDoc(doc(db, `producers/${currentProducerText.trim().replaceAll(" ", "-")}-${uuid}`), {
                name: currentProducerText,
                id: `producer/${currentProducerText.trim().replaceAll(" ", "-")}-${uuid}`
            });
            proposedProducers.push({text: currentProducerText, id: `producer/${currentProducerText.trim().replaceAll(" ", "-")}-${uuid}`});
            proposedProducers = proposedProducers;
            producersForQuerying.push(currentProducerText);
            producersForQuerying = producersForQuerying;
            currentProducerText = "";
            hideTypeaheadCreateForProducers = true;
            autocompleteResultsForProducers = [];
        }
    }

    function handleTypeaheadDisplayForWriters() {
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
            autocompleteResultsForWriters = [];
        }
    }

    async function findRecommendations() {
        if (genresForRecommendations.length === 0) return;
        const newArr = genresForRecommendations.filter((item, index) => {
            return index <= 9;
        });
        
        const recommendedTracksRef = collection(db, `tracks`);
        const recommendedTracksDanceability = query(recommendedTracksRef, 
            where("genreNames", "array-contains-any", newArr), 
            where("features.danceability", ">=", trackData?.features?.danceability - .1), 
            where("features.danceability", "<", trackData?.features?.danceability + .1), 
            orderBy("features.danceability", "desc"),
            limit(10));
        const recommendedTracksDanceabilityDocs = await getDocs(recommendedTracksDanceability);
        
        const recommendedTracksEnergy = query(recommendedTracksRef, 
            where("genreNames", "array-contains-any", newArr), 
            where("features.energy", ">=", trackData?.features?.energy - .1), 
            where("features.energy", "<", trackData?.features?.energy + .1), 
            orderBy("features.energy", "desc"),
            limit(10));
        const recommendedTracksEnergyDocs = await getDocs(recommendedTracksEnergy);

        const recommendedTracksHappiness = query(recommendedTracksRef, 
            where("genreNames", "array-contains-any", newArr), 
            where("features.valence", ">=", trackData?.features?.valence - .1), 
            where("features.valence", "<", trackData?.features?.valence + .1), 
            orderBy("features.valence", "desc"),
            limit(10));
        const recommendedTracksHappinessDocs = await getDocs(recommendedTracksHappiness);

        recommendedTracksDanceabilityDocs.forEach(doc => {
            if (!find(recommendedTracks, {id: doc.id})) {
                recommendedTracks.push({...doc.data(), id: doc.id});
                recommendedTracks = recommendedTracks;
            }
        });

        recommendedTracksEnergyDocs.forEach(doc => {
            if (!find(recommendedTracks, {id: doc.id})) {
                recommendedTracks.push({...doc.data(), id: doc.id});
                recommendedTracks = recommendedTracks;
            }
        });

        recommendedTracksHappinessDocs.forEach(doc => {
            if (!find(recommendedTracks, {id: doc.id})) {
                recommendedTracks.push({...doc.data(), id: doc.id});
                recommendedTracks = recommendedTracks;
            }
        });
    }

    async function findUserActivity() {
        const users = collection(db, `users`);
        const userTopTracksQuery = query(users, 
            where("topTracks", "array-contains-any", [$page.params.id]), 
            limit(6));
        const userTopTracks = await getDocs(userTopTracksQuery);
        userTopTracks.forEach(doc => {
            if (!find(userActivity, doc.id)) {
                userActivity.push(doc.id);
                userActivity = userActivity;
            }
        });
    }

    const getDaysArray = function (start, end) {
        for (var arr = [], dt = new Date(start); dt <= new Date(end); dt.setDate(dt.getDate() + 1)) {
            arr.push(new Date(dt));
        }

        return arr;
    }
</script>

<Modal header="All genres" bind:hideModal={hideModalGenres}><svelte:fragment slot="body">
    {#each publicGenre as genre}
        <a href="/{genre.id}" class="drop-shadow-xl hover:-translate-y-[0.10rem] transition-all block mt-2 py-1 px-2 text-center bg-slate-700 rounded-lg not-italic text-white pl-1">{genre.text}</a>
    {/each}
</svelte:fragment></Modal>

<Modal header="All labels" bind:hideModal={hideModalLabels}><svelte:fragment slot="body">
    {#each publicLabels as label}
        <a href="/{label.id}" class="drop-shadow-xl hover:-translate-y-[0.10rem] transition-all block mt-2 py-1 px-2 text-center bg-slate-700 rounded-lg not-italic text-white pl-1">{label.text}</a>
    {/each}
</svelte:fragment></Modal>

<Modal header="All producers" bind:hideModal={hideModalProducers}><svelte:fragment slot="body">
    {#each publicProducers as producer}
        <a href="/{producer.id}" class="drop-shadow-xl hover:-translate-y-[0.10rem] transition-all block mt-2 py-1 px-2 text-center bg-slate-700 rounded-lg not-italic text-white pl-1">{producer.text}</a>
    {/each}
</svelte:fragment></Modal>

<Modal header="All writers" bind:hideModal={hideModalWriters}><svelte:fragment slot="body">
    {#each publicWriters as writer}
        <a href="/{writer.id}" class="drop-shadow-xl hover:-translate-y-[0.10rem] transition-all block mt-2 py-1 px-2 text-center bg-slate-700 rounded-lg not-italic text-white pl-1">{writer.text}</a>
    {/each}
</svelte:fragment></Modal>

<div class="mx-6 mt-2 text-sm breadcrumbs">
    <ul>
        <li><a href="/track/top/{new Date().getFullYear()}">Tracks</a></li>
        <li>{trackData?.name}</li>
    </ul>
</div>

<div bind:this={detailElement} class:-z-50={hide} class="flex sticky top-[-1px] justify-start">
    <img on:load={() => {
        // const colorThief = new ColorThief();
        // const color = colorThief.getColor(thumbnailElement, 10);
        // console.log(color);
    }} bind:this={thumbnailElement} class:opacity-20={hide} class:scale-50={hide} class="max-h-[300px] min-h-[300px] max-w-[300px] min-w-[300px] origin-top-left transition-all hover:opacity-100 rounded-lg outline-4 drop-shadow-xl m-6" src={trackData?.album?.images[1]?.url} alt="Album cover"/>
    <div class:opacity-0={hide} class:pointer-events-none={hide} class="transition-opacity flex w-full">
        <div class="my-8 basis-3/5">
            <h1 class="max-w-[90%] text-6xl break-words font-black">{trackData?.name}</h1> 
            <h2 class="max-w-[90%] text-4xl font-bold">by <a class="hover:underline" href="/artist/{trackData?.album?.artists[0]?.id}">{trackData?.album?.artists[0]?.name}</a></h2>
            <h3 class="max-w-[90%] text-2xl font-medium">on
                {#if trackData?.album?.album_type !== "single" || trackData?.album?.total_tracks >= 4}
                    <a class="hover:underline" href="/album/{trackData?.album?.id}">{trackData?.album?.name}</a>
                {:else}
                    {trackData?.album?.name}
                {/if}
            </h3>
    
            <div class="w-16 mt-4">
                <Rating bind:ratingColor={ratingColor} avgRating={trackData?.avgRating}/>
            </div>
            {#if trackData?.numRatings === 1}
                <p class="my-1 mb-6 italic">based on {trackData?.numRatings} rating</p>
            {:else}
                <p class="my-1 mb-6 italic">based on {trackData?.numRatings} ratings</p>
            {/if}
            <a class="text-lg rounded-lg drop-shadow-xl transition-all hover:-translate-y-8 px-4 py-2 bg-slate-700" href={trackData?.album?.external_urls}><Icon data={faPlayCircle} class="mr-2"/>Listen to {trackData?.album?.name} on Spotify</a>
        </div>
        <div class="my-8 mr-6 float-right basis-2/5">
            <div class="text-sm transition-all hover:-translate-y-1 p-4 drop-shadow-xl rounded-lg bg-gray-800" id="detail-box">
                <h2 class="italic inline text-gray-400">TRACK DETAILS</h2>
                <button class="float-right inline" on:click={enterChangeMode}>Change</button>
                <div id="divider" class="w-full bg-gray-700 h-0.5"></div>
                <p><span class="italic text-gray-400 pr-1">date</span> {releaseDate?.getUTCFullYear()}-{releaseDate?.getUTCMonth() + 1}-{releaseDate?.getUTCDate()}</p>
                <p><span class="italic text-gray-400 pr-1">track no.</span> {trackData?.track_number}/{trackData?.album?.total_tracks}</p>
                <p><span class="italic text-gray-400 pr-1">length</span> {duration}</p>
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
                                if (hideModalLabels) {
                                    hideModalLabels = false;
                                } else {
                                    hideModalLabels = true;
                                }
                            }}>view all</button>    
                        {:else}
                            {#each publicLabels as label}
                                <a href="/{label.id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={inChangeMode}>{label.text}</a>
                            {/each}
                        {/if}
                        {#each proposedLabels as label}
                            <span class:hidden={!inChangeMode} class="not-italic text-white p-1 mr-1 bg-slate-700 rounded-lg">
                                <a class="text-center" href="/{label.id}">{label.text} </a>
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
                    <p class="italic text-gray-400">genres 
                        {#if publicGenre.length > 3}
                            <a href="/{publicGenre[0].id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={inChangeMode}>{publicGenre[0].text}</a>
                            <a href="/{publicGenre[1].id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={inChangeMode}>{publicGenre[1].text}</a>
                            <a href="/{publicGenre[2].id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={inChangeMode}>{publicGenre[2].text}</a>
                            <button type="button" class="italic" class:hidden={inChangeMode} on:click|preventDefault={() => {
                                if (hideModalGenres) {
                                    hideModalGenres = false;
                                } else {
                                    hideModalGenres = true;
                                }
                            }}>view all</button>    
                        {:else}
                            {#each publicGenre as genre}
                                <a href="/{genre.id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={inChangeMode}>{genre.text}</a>
                            {/each}
                        {/if}
                        {#each proposedGenre as genre}
                            <span class:hidden={!inChangeMode} class="not-italic text-white p-1 mr-1 bg-slate-700 rounded-lg">
                                <a class="text-center" href="/{genre.id}">{genre.text} </a>
                                <button type="button" on:click|stopPropagation|preventDefault={() => {
                                    remove(proposedGenre, {
                                        text: genre.text,
                                    });
                                    const newArr = genresForRecommendations.filter(item => {
                                        return item !== genre.text;
                                    });
                                    proposedGenre = proposedGenre;
                                    genresForRecommendations = newArr;
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
                                if (hideModalProducers) {
                                    hideModalProducers = false;
                                } else {
                                    hideModalProducers = true;
                                }
                            }}>view all</button>    
                        {:else}
                            {#each publicProducers as producer}
                                <a href="/{producer.id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={inChangeMode}>{producer.text}</a>
                            {/each}
                        {/if}
                        {#each proposedProducers as producer}
                            <span class:hidden={!inChangeMode} class="not-italic text-white p-1 mr-1 bg-slate-700 rounded-lg">
                                <a class="text-center" href="/{producer.id}">{producer.text} </a>
                                <button type="button" on:click|stopPropagation|preventDefault={() => {
                                    remove(proposedProducers, {
                                        text: producer.text,
                                    });
                                    const newArr = producersForQuerying.filter(item => {
                                        return item !== producer.text;
                                    });
                                    producersForQuerying = newArr;
                                    proposedProducers = proposedProducers;
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
                                if (hideModalWriters) {
                                    hideModalWriters = false;
                                } else {
                                    hideModalWriters = true;
                                }
                            }}>view all</button>    
                        {:else}
                            {#each publicWriters as writer}
                                <a href="/{writer.id}" class="first:ml-1 mt-2 py-1 text-center px-2 bg-slate-700 rounded-lg mr-1 not-italic text-white pl-1" class:hidden={inChangeMode}>{writer.text}</a>
                            {/each}
                        {/if}
                        {#each proposedWriters as writer}
                            <span class:hidden={!inChangeMode} class="not-italic text-white p-1 mr-1 bg-slate-700 rounded-lg">
                                <a class="text-center" href="/{writer.id}">{writer.text} </a>
                                <button type="button" on:click|stopPropagation|preventDefault={() => {
                                    remove(proposedWriters, {
                                        text: writer.text,
                                    });
                                    const newArr = writersForQuerying.filter(item => {
                                        return item !== writer.text;
                                    });
                                    writersForQuerying = newArr;
                                    proposedWriters = proposedWriters;
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
                <p class="font-bold text-right max-w-[90%]">Popularity of {trackData?.name} in the past week</p>
                <div class="" use:chartMethod={options}></div>
            </div>
            {/if}
        </div>
    </div>
</div>

<div class="mx-6 divider"></div>

{#if userActivity.length !== 0}
    <div class="mx-6">
        <h2 class="text-4xl font-black mb-4">User Activity</h2>
        <div class="grid grid-flow-row-dense grid-cols-3 gap-4">
            {#each userActivity as user}
                {#await getDoc(doc(db, `users/${user}`))}
                    <p>{user} listens to {trackData?.name} a lot</p>
                {:then data}
                    <a href="/user/{user}" class="drop-shadow-xl hover:-translate-y-1 transition-all">
                        <img class="inline-block align-bottom rounded-full h-10 w-10" src="{data.get("photoURL")}" alt="Profile picture of {data.get("displayName")}">
                        <span class="pl-2 inline-block">
                            <p class="text-xl font-bold">{data.get("displayName")}</p>
                            <p class="text-xs">listens to {trackData?.name} a lot</p>        
                        </span>
                    </a>
                {:catch err}
                    <p>{user} listens to {trackData?.name} a lot</p>
                {/await}
            {/each}
        </div>
    </div>

    <div class="mx-6 divider"></div>
{/if}

<div class="mx-6">
    <h2 class="text-4xl font-black">Reviews</h2>
    {#if trackData?.numRatings === 1}
        <h3 class="text-2xl font-bold">{trackData?.numRatings} review</h3>
    {:else}
        <h3 class="text-2xl font-bold">{trackData?.numRatings} reviews</h3>
    {/if}
    <TrackReview fromDoc="tracks/{$page.params.id}/reviews/{userId}" fromCollection="tracks/{$page.params.id}/reviews" commentHref="/track/reviews/{$page.params.id}/" likeDoc="tracks/{$page.params.id}/reviews/" trackId={$page.params.id} trackName={trackData?.name} trackAuthor={trackData?.album?.artists[0]?.name} trackHref={trackData?.album?.images[1]?.url} {userId}/>
</div>

<div class="mx-6 divider"></div>

<div class="mx-6">
    <h2 class="text-4xl align-middle font-black inline">Shoutbox</h2>
    <button class="ml-4 px-2 py-1 bg-slate-700 hover:-translate-y-1 drop-shadow-xl rounded-lg transition-all" on:click={() => { commentCollapsed = !commentCollapsed }}>collapse</button>
    {#if !commentCollapsed}
        <div class="mt-4" transition:slide>
            <Comments fromCollection={`tracks/${$page.params.id}/comments`} fromDoc={`tracks/${$page.params.id}/comments/${uuidv4()}`}/>
        </div>
    {/if}
</div>

<div class="mx-6 divider"></div>

<div class="mx-6" id="track-analysis-features">
    <h2 class="text-4xl font-black mb-4">Analysis & Features</h2>
    <div class="grid grid-flow-row-dense grid-cols-3 gap-4">
        <div class="text-center transition-all hover:-translate-y-1 p-4 drop-shadow-xl rounded-lg bg-gray-800" id="tempo">
            <h2 class="text-4xl font-black">{Math.round(trackData?.analysis?.tempo)} bpm</h2>
            <p class="font-bold">Tempo</p>
        </div>
        <div class="text-center transition-all hover:-translate-y-1 p-4 drop-shadow-xl rounded-lg bg-gray-800" id="time-signature">
            <h2 class="text-4xl font-black">{trackData?.analysis?.time_signature}/4</h2>
            <p class="font-bold">Time Signature</p>
        </div>
        <div class="text-center transition-all hover:-translate-y-1 p-4 drop-shadow-xl rounded-lg bg-gray-800" id="key">
            <h2 class="text-4xl font-black">{key}</h2>
            <p class="font-bold">Key</p>
        </div>
        <div class="flex flex-col items-center justify-center transition-all hover:-translate-y-1 p-4 drop-shadow-xl rounded-lg bg-gray-800" id="danceability">
            <h2 class="text-4xl mb-1 font-black">{Math.round(trackData?.features?.danceability * 100)}%</h2>
            <div class="w-8/12 bg-gray-200 h-1">
                <div class="bg-blue-600 h-1" style="width: {trackData?.features?.danceability * 100}%"></div>
            </div>
            <p class="font-bold mt-1">Danceability</p>
            <p class="italic text-sm font-semibold">{danceability}</p>
        </div>
        <div class="flex flex-col items-center justify-center transition-all hover:-translate-y-1 p-4 drop-shadow-xl rounded-lg bg-gray-800" id="energy">
            <h2 class="text-4xl mb-1 font-black">{Math.round(trackData?.features?.energy * 100)}%</h2>
            <div class="w-8/12 bg-gray-200 h-1">
                <div class="bg-blue-600 h-1" style="width: {trackData?.features?.energy * 100}%"></div>
            </div>
            <p class="font-bold mt-1">Energy</p>
            <p class="italic text-sm font-semibold">{energy}</p>
        </div>
        <div class="flex flex-col items-center justify-center transition-all hover:-translate-y-1 p-4 drop-shadow-xl rounded-lg bg-gray-800" id="valence">
            <h2 class="text-4xl mb-1 font-black">{Math.round(trackData?.features?.valence * 100)}%</h2>
            <div class="w-8/12 bg-gray-200 h-1">
                <div class="bg-blue-600 h-1" style="width: {trackData?.features?.valence * 100}%"></div>
            </div>
            <p class="font-bold mt-1">Happiness</p>
            <p class="italic text-sm font-semibold">{valence}</p>
        </div>
    </div>
</div>
<div class="mx-6 divider"></div>

{#if recommendedTracks.length > 1}
    <div class="mx-6">
        <h2 class="text-4xl font-black mb-4">Recommendations</h2>
        <div class="w-full h-fit whitespace-nowrap overflow-x-auto fade-in-left-right">
            {#each recommendedTracks as track}
                {#if track.id !== $page.params.id}
                    <TrackThumbnail classes="!whitespace-normal mr-1" href="/track/{track.id}" src={track.album.images[1].url} alt="" title={track.name} artist={track.album.artists[0].name}/>
                {/if}
            {/each}
        </div>    
    </div>
    <div class="mx-6 divider"></div>
{/if}

{#if moreTracksByArtist.length !== 0}
    <div class="mx-6">
        <h2 class="text-4xl font-black mb-4">More tracks by {trackData?.album?.artists[0]?.name}</h2>
        <div class="w-full h-full overflow-y-visible whitespace-nowrap overflow-x-auto fade-in-left-right">
            {#each moreTracksByArtist as track}
                <TrackThumbnail classes="!whitespace-normal mr-1" href="/track/{track.id}" src={track.image} alt="" title={track.name} artist={track.artists[0].name}/>
            {/each}
        </div>
    </div>

    <div class="mx-6 divider"></div>
{/if}

<div class="mx-6">
    <h2 class="text-4xl font-black mb-4">More tracks</h2>
    <div class="w-full h-fit whitespace-nowrap overflow-x-auto fade-in-left-right">
        {#each moreTracks as track}
            <TrackThumbnail classes="!whitespace-normal mr-1" href="/track/{track.id}" src={track.image} alt="" title={track.name} artist={track.artists[0].name}/>
        {/each}
    </div>
</div>

<style>
    .fade-in-left-right {
        mask-image: linear-gradient(transparent, black 20%, black 80%, transparent 100%);
        -webkit-mask-image: linear-gradient( to right,transparent, black 20%, black 80%, transparent 100%);
    }
</style>