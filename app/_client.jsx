import { createRoot } from 'react-dom/client';
import { createFromFetch } from 'react-server-dom-webpack/client';

// HACK: map webpack resolution to native ESM
// @ts-expect-error Property '__webpack_require__' does not exist on type 'Window & typeof globalThis'.
window.__webpack_require__ = async (id) => {
	return import(id);
};

// @ts-expect-error `root` might be null
const root = createRoot(document.getElementById('root'));

/**
 * Fetch your server component stream from `/rsc`
 * and render results into the root element as they come in.
 */
createFromFetch(fetch('/rsc')).then((comp) => {
	root.render(comp);
});

const socket = new WebSocket('ws://localhost:8080');

socket.addEventListener('open', function () {
	socket.send('Hello Server!');
});

socket.addEventListener('message', async function (event) {
	console.log('Message from server ', event);
	const { comp } = JSON.parse(event.data);
	const stream = iteratorToStream([comp].values());
	const comp2 = await createFromFetch(Promise.resolve({ body: stream }));
	root.render(comp2);
});

socket.addEventListener('error', console.error);

function iteratorToStream(iterator) {
	return new ReadableStream({
		async pull(controller) {
			const { value: strValye, done } = await iterator.next();

			if (done) {
				controller.close();
			} else {
				const value = new TextEncoder().encode(strValye);
				controller.enqueue(value);
			}
		}
	});
}
