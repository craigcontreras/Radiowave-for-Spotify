<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { signInWithCustomToken } from 'firebase/auth';
    import { auth } from '../firebase.js';

    let errorMessage = '';

    onMount(async () => {
        const error = new URLSearchParams(window.location.search).get('error');
        const messages = {
            invalid_state: 'Your login session expired. Please try again.',
            access_denied: 'Spotify sign-in was cancelled. You can try again below.',
            missing_code: 'Spotify did not return a sign-in code. Please try again.',
            authentication_failed: 'Could not complete Spotify sign-in. Please try again.',
        };
        if (error) {
            errorMessage = messages[error] || 'Could not sign in. Please try again.';
            return;
        }

        try {
            const response = await fetch('/api/v1/firebase', {
                method: 'POST',
                credentials: 'same-origin',
            });
            if (!response.ok) {
                errorMessage = 'Your sign-in has expired. Please try again.';
                return;
            }
            const { access_firebase } = await response.json();
            await signInWithCustomToken(auth, access_firebase);
            await goto('/home', { replaceState: true });
        } catch {
            errorMessage = 'Could not finish signing in. Please try again.';
        }
    });
</script>

{#if errorMessage}
    <p role="alert">{errorMessage}</p>
    <a href="/auth/login" rel="external">Try Spotify login again</a>
{:else}
    <p role="status">Logging in...</p>
{/if}
