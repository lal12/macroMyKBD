import './dispose.js'; // needs to be imported once somewhere

export interface SingleEvent<T = void>{
	subscribe(handler: (event: T) => void): () => void;
}

export interface SingleEventHandler<T = void> extends Disposable{
	pub: SingleEvent<T>;
	emit: (event: T) => void;
}

export function createSingleEvent<T = void>(): SingleEventHandler<T>{
	let i = 0;
	const handlers: Map<number, (event: T) => void> = new Map();
	return {
		pub: {
			subscribe(handler: (event: T) => void): () => void {
				handlers.set(i++, handler);
				return () => {
					handlers.delete(i);
				};
			}
		},
		emit(event: T): void {
			for (const handler of handlers.values()) {
				handler(event);
			}
		},
		[Symbol.dispose](){
			handlers.clear();
		}
	};
}
