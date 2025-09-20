import './dispose.js'; // needs to be imported once somewhere

export interface SingleEvent<T = void>{
	subscribe(handler: (event: T) => void): () => void;
}

export interface SingleEventHandler<T = void> extends Disposable, SingleEvent<T>{
	pub: SingleEvent<T>;
	emit: (event: T) => void;
}

class SingleEventInst<T = void> implements SingleEventHandler<T>{
	private _id = 1;
	private _handlers: Map<number, (event: T) => void> = new Map();
	subscribe(handler: (event: T) => void): () => void {
		const id = this._id++;
		this._handlers.set(id, handler);
		return () => {
			this._handlers.delete(id);
		};
	}
	public get pub(): SingleEvent<T> {
		return {
			subscribe: this.subscribe.bind(this)
		}
	}
	emit(event: T): void {
		for (const handler of this._handlers.values()) {
			handler(event);
		}
	}
	[Symbol.dispose](): void {
		this._handlers.clear();
	}
}

export function createSingleEvent<T = void>(): SingleEventHandler<T>{
	return new SingleEventInst<T>();
}
