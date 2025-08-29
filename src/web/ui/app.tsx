import React from 'react';
import { useData } from "./ws";
import { Tab, TabList, TabValue, FluentProvider, webLightTheme, webDarkTheme } from "@fluentui/react-components";
import { KeyboardTab } from './keyboards';
import { ActionTab } from './actions';

const getInitialTheme = () => {
	if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return webLightTheme;
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? webDarkTheme : webLightTheme;
};

function useSystemTheme() {
	const [theme, setTheme] = React.useState(() => getInitialTheme());

	React.useEffect(() => {
		if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return;

		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = (e: MediaQueryListEvent) => setTheme(e.matches ? webDarkTheme : webLightTheme);

		// Older browsers use addListener/removeListener
		if (mq.addEventListener) mq.addEventListener('change', handleChange);
		else mq.addListener(handleChange);

		return () => {
			if (mq.removeEventListener) mq.removeEventListener('change', handleChange);
			else mq.removeListener(handleChange);
		};
	}, []);

	return theme;
}

const useHash = (key: string, defaultValue: string) => {
	const [value, setValue] = React.useState(() => {
		if (typeof window === 'undefined' || !window.location.hash) return defaultValue;
		const params = new URLSearchParams(window.location.hash.slice(1));
		return params.get(key) || defaultValue;
	});

	React.useEffect(() => {
		if (typeof window === 'undefined') return;
		const onHashChange = () => {
			if (!window.location.hash) {
				setValue(defaultValue);
				return;
			}
			const params = new URLSearchParams(window.location.hash.slice(1));
			setValue(params.get(key) || defaultValue);
		};
		window.addEventListener('hashchange', onHashChange);
		return () => window.removeEventListener('hashchange', onHashChange);
	}, [key, defaultValue]);

	React.useEffect(() => {
		if (typeof window === 'undefined') return;
		const params = new URLSearchParams(window.location.hash.slice(1));
		if (value) params.set(key, value);
		else params.delete(key);
		const newHash = params.toString();
		if (newHash !== window.location.hash.slice(1)) {
			window.history.replaceState(null, '', newHash ? `#${newHash}` : window.location.pathname + window.location.search);
		}
	}, [key, value]);

	return [value, setValue] as const;
};

export const App = () => {
	const [tab, setTab] = useHash('tab', 'keyboards');
	const theme = useSystemTheme();
	return <FluentProvider theme={theme} style={{ height: '100vh', width: '100vw' }}>
		<div style={{ padding: 24 }}>
			<TabList selectedValue={tab} onTabSelect={(_, data) => setTab(data.value as any)}>
				<Tab value="keyboards">Keyboards</Tab>
				<Tab value="actions">Actions</Tab>
			</TabList>

			{tab === 'keyboards' && <KeyboardTab />}
			{tab === 'actions' && <ActionTab />}
		</div>
	</FluentProvider>;
};
