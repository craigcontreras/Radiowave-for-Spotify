import cookie from "cookie";

export async function handle({event, resolve}) {
    const cookies = cookie.parse(event.request.headers.get("Cookie") || "");
    event.locals.access_firebase = cookies.access_firebase || null;
    
    const response = await resolve(event);
    response.headers.set(
        "Set-Cookie",
        cookie.serialize("access_firebase", event.locals.access_firebase, {
            path: "/",
            secure: true,
            httpOnly: true,
            sameSite: true
        }),
    );

    return response;
}

export async function getSession(event) {
    return {
        access_firebase: event.locals.access_firebase
    }
}