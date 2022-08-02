import cookie from "cookie";
import { minify } from 'html-minifier';

const minification_options = {
	collapseBooleanAttributes: true,
	collapseWhitespace: true,
	conservativeCollapse: true,
	decodeEntities: true,
	html5: true,
	ignoreCustomComments: [/^#/],
	minifyCSS: true,
	minifyJS: true,
	removeAttributeQuotes: true,
	removeComments: true,
	removeOptionalTags: true,
	removeRedundantAttributes: true,
	removeScriptTypeAttributes: true,
	removeStyleLinkTypeAttributes: true,
	sortAttributes: true,
	sortClassName: true,
	removeEmptyElements: true
};

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
    
	if (response.headers['content-type'] === 'text/html') {
		response.body = minify(response.body, minification_options); //Minifies the response.body
	}

    return response;
}

export async function getSession(event) {
    console.log(event.request.headers.get("user-agent"));
    return {
        userAgent: event.request.headers.get("user-agent"),
        access_firebase: event.locals.access_firebase
    }
}