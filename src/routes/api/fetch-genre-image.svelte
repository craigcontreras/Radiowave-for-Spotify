<script context="module">
    export function load({ url, session }) {
        const ref = url.searchParams.get("name") || "N/A";
        const userAgent = session.userAgent;
        return {
            props: {
                ref,
                userAgent
            }
        }
    }
</script>

<script>
    import { browser } from "$app/env";
    export let ref;

    if (userAgent !== "puppeter") {
        if (browser) {
            goto("/error");
        }
    }
</script>

<div class="bg-gradient-to-br from-indigo-600 via-purple-800 to-violet-700 flex flex-col items-center justify-center h-[400px] w-[400px]">
    <p class="font-black text-6xl text-center break-words max-w-[90%]">{ref.toUpperCase()}</p>
</div>