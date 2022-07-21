<script>
    import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
    import { createEventDispatcher } from "svelte";
    import { db } from "../firebase.js";
    import Typeahead from "./Typeahead.svelte";

    export let collectionType;
    export let characterRegex;
    export let hideTypeaheadCreate = true;
    export let inChangeMode;
    export let autocompleteResults = [];
    export let currentLabelText = "";

    const dispatch = createEventDispatcher();

    function handleTypeaheadCreation(event) {
        dispatch("handleTypeaheadCreation");
    }

    function handleTypeaheadSelection(event) {
        dispatch("handleTypeaheadSelection", {
            text: event.detail.text,
            id: event.detail.id,
        });
    }

    function handleTypeaheadDisplay() {
        dispatch("handleTypeaheadDisplay");
    }
</script>

<span class="inline-flex">
    <input on:keypress={(evt) => {
        if (!characterRegex.test(evt.key)) {
            evt.preventDefault();
        }
    }} on:keydown={() => {
        handleTypeaheadDisplay();
        if (!currentLabelText || currentLabelText === "" || currentLabelText.trim() === "") {
            autocompleteResults = [];
        }
    }} on:keyup={async (evt) => {
        handleTypeaheadDisplay();
        if (currentLabelText || currentLabelText !== "" || currentLabelText.trim() !== "") {
            const labelRef = collection(db, collectionType);
            const labelQuery = query(labelRef, orderBy(`searchableIndex.${currentLabelText.toLowerCase()}`), limit(5));
            const labels = await getDocs(labelQuery);
            let temp = [];
    
            labels.forEach(doc => {
                temp.push({
                    name: doc.data().name.toLowerCase(),
                    displayName: doc.data().name,
                    id: doc.id,
                });
                temp = temp;
    
                if (currentLabelText || currentLabelText !== "" || currentLabelText.trim() !== "") {
                    autocompleteResults = temp;
                }
            });
        } else {
            hideTypeaheadCreate = true;
            autocompleteResults = [];
        }
    }} bind:value={currentLabelText} class="pl-1 bg-transparent text-white italic" class:hidden={!inChangeMode} placeholder="type here..." type="text">
    <Typeahead classes="absolute mt-5 not-italic text-white" {hideTypeaheadCreate} {currentLabelText} on:typeaheadcreate={handleTypeaheadCreation} on:typeaheadselected={handleTypeaheadSelection} items={autocompleteResults}/>    
</span>

<style>

</style>