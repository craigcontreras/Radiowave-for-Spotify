<script context="module">
    export async function load({ error, status }) {
        return {
            props: {
                message: error.message,
                status,
            }
        }
    }
</script>

<script>
    export let message;
    export let status;
</script>

<p>{status}</p>
<p>{message}</p>

<style>

</style>