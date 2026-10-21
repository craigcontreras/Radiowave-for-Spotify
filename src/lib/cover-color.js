// This package's non-worker bundle works with Vite 3's CommonJS interop.
export function coverColor(image, setColor) {
    let destroyed = false;
    let request = 0;

    async function updateColor() {
        const currentRequest = ++request;
        const source = image.src;
        if (!source || !image.naturalWidth) return;

        try {
            const { default: Vibrant } = await import('node-vibrant/lib/bundle.js');
            const palette = await Vibrant.from(source).getPalette();
            if (!destroyed && currentRequest === request && source === image.src) {
                setColor(palette.DarkVibrant?.getHex() || palette.Vibrant?.getHex() || '');
            }
        } catch {
            if (!destroyed && currentRequest === request && source === image.src) {
                setColor('');
            }
        }
    }

    image.addEventListener('load', updateColor);
    if (image.complete) void updateColor();

    return {
        destroy() {
            destroyed = true;
            image.removeEventListener('load', updateColor);
        },
    };
}
