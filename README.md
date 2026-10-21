# Radiowave for Spotify (radiowave.app)

Radiowave for Spotify was a website I created in June 2022 as a sophomore in high school using SvelteKit, Express, TailwindCSS, daisyUI, and Firebase. It was a music rating website integrated into Spotify. The onboarding process was Spotify -> registering on Firebase using the user's Spotify account details. I would fetch album and track details from Spotify, and then store that data into Firestore.

I created an Express server (/src/webserver) to handle my custom Spotify integration, which was a stupid design choice because SvelteKit has server-only modules --- could've just implemented it in SvelteKit. This led to a weird and hacky Express/SvelteKit/node-adapter integration which wasn't necessary whatsoever. I was 16 though, so cut me some slack.

I also used Spotify's API to show a user's top played songs, albums, etc. --- I also created the functionality to show a user's most recently played using cron jobs on the Express server that was used for my custom Spotify integration, but the cron jobs were super buggy.

A big issue with my Spotify integration was that the only songs that were allowed on the database were from Spotify. I didn't implement the option to create songs or albums that weren't on Spotify --- also only worked for Spotify users, no Apple Music, Deezer, etc. --- very bad idea but I was 16, so I didn't understand that

I stopped working on it in October 2022 after a loss in interest and seeing that there were other websites that did it better with a much larger database of songs. However, there is still no mobile app---might be an untapped market. At the time, SvelteKit hadn't even released its first stable release.

I updated it on October 21, 2026 to get the authentication process working, and to get rid of all of my admin credential keys for Spotify and Firebase cause they were all hardcoded in here (Jesus!)

You can get it working yourself by providing your own Firebase credentials (should be in /src/firebase.json) and service account key (should be in /adminsdk.json), and client/secret ID for Spotify in the .env.

To get started:

```shell
npm ci
npm run dev
```

Enjoy! You could probably use this as a starter codebase if you're trying to implement Spotify OAuth yourself, but honestly: don't trust this... The OAuth flowchart on Spotify's developer page was what I used, and it was more than enough.
