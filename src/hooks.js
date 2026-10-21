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
    const response = await resolve(event);
    
	if (response.headers['content-type'] === 'text/html') {
		response.body = minify(response.body, minification_options); //Minifies the response.body
	}

    return response;
}

export async function getSession(event) {
    return {
        userAgent: event.request.headers.get("user-agent")
    }
}
