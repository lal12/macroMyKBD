import React from 'react';
import {createRoot} from 'react-dom/client';
import { useConnected } from './ws';
import { App } from './app';

window.onload = async () => {
	const root = createRoot(document.getElementById('root')!);
	root.render(<Waiting />);
};

const Waiting = () => {
	const [connected, onceConnected] = useConnected();
	console.log('connected', connected);
	if(connected) return <App />;
	if(onceConnected) return <div>
		<h2>Connection lost. Please restart the application.</h2>
	</div>;
	return <div>
		<h2>Waiting for connection...</h2>
	</div>;
}

