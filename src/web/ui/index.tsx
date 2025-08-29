import React from 'react';
import {createRoot} from 'react-dom/client';
import { connected } from './ws';
import { App } from './app';

window.onload = async () => {
	const root = createRoot(document.getElementById('root')!);
	root.render(<Waiting />);
	await connected;
	root.render(<App />);
};

const Waiting = () => {
	return <div>
		<h2>Waiting for connection...</h2>
	</div>;
}

