<script context="module">
    export function load({ url }) {
        const ref = url.searchParams.get("name") || "N/A";
        return {
            props: {
                ref,
            }
        }
    }
</script>

<script>
    import { browser } from "$app/env";
    import { goto } from "$app/navigation";
    import { session } from "$app/stores";
    import { get } from "svelte/store";
    export let ref;

    const {userAgent} = get(session);

    if (userAgent !== "puppeteer") {
        if (browser) {
            goto("/error");
        }
    }
</script>

<div class="bg-gradient-to-br from-indigo-600 via-purple-800 to-violet-700 flex flex-col items-center justify-center h-[400px] w-[400px]">
    <p class="font-black text-6xl text-center break-words max-w-[90%]">{ref.toUpperCase()}</p>
</div>