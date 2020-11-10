interface Floofy {
	/** Executes the given function on all current and future elements that match the selector */
	for: (el: HTMLElement) => void;

	/** Returns the requested element, if it doesn't exist, it will be created to best match the selector */
	actual: HTMLElement;

	/** Creates as few elements as possible to best matching the selector, unlike `actual`, this will create at least one element regardless of whether it already exists */
	new: HTMLElement;

	/** Returns all elements which match the selector, same as _querySelectorAll_ */
	all: HTMLElement[];

	/** Returns the first element which matches the selector, same as _querySelector_ */
	first?: HTMLElement;
}

/** Handlers for url-based page selection */
type Page<T = any> = (data: T) => void | (() => void);

/** A context for floofy selectors */
type Floofle = { [selector: string]: Floofy };

interface String {
	readonly f: Floofy;
}

interface HTMLElement {
	readonly f: Floofle;
}

interface Location {
	readonly f: Page;
}

function floofy(selector: string, context: ParentNode = document): Floofy {
	let floof = {} as Floofy;

	const parse_element = (selector: string): HTMLElement => {
		let el: HTMLElement = null;

		selector = selector.replace(/^[\w-_]+/, tag => {
			el = document.createElement(tag);
			return "";
		});

		if (!el) el = document.createElement("div");

		selector = selector.replace(/\[[\w\-_]*(\s*=\s*)?([\w\-_]+|"((?!").)*"|'((?!').*)')\]/g, attr => {
			let [name, value] = attr.replace(/(^\[|\]$)/g, "").split("=").map(seg => seg.trim());

			if (value) {
				value = value.replace(/(^"|"$)/g, "").replace(/(^'|'$)/g, "");
			}

			el.setAttribute(name, value || "");

			return "";
		});

		selector = selector.replace(/(?<=#)[\w-_]+/g, id => {
			el.id = id;

			return "";
		});

		selector = selector.replace(/(?<=.)[\w-_]+/g, cls => {
			el.classList.add(cls);

			return "";
		});

		return el;
	}

	const select = (selector: string[], always_new: boolean) => {
		let next = context;

		for (let i = 0; i < selector.length; i++) {
			let segment = selector[i];
			let el = next.querySelector(segment);

			if ((!always_new || i !== selector.length - 1) && el) {
				next = el;
			}
			else {
				el = parse_element(segment);
				
				floofy.match_element(el as HTMLElement);

				next.append(el);
				next = el;
			}
		}

		return next;
	}

	Object.defineProperty(floof, "actual", {
		get: () => {
			let el = select(selector.split(/[\s>]/g).filter(sel => sel.length > 0), false);

			el[floofy.parent_selector] = selector;

			return el;
		}
	});
	
	Object.defineProperty(floof, "new", {
		get: () => {
			let el = select(selector.split(/[\s>]/g).filter(sel => sel.length > 0), true);

			el[floofy.parent_selector] = selector;

			return el;
		}
	});
	
	Object.defineProperty(floof, "for", {
		get: () => (() => undefined),
		set: (constructor: (el: HTMLElement) => void) => {
			let contextual_selector = selector;

			for (let element = context; element instanceof HTMLElement; element = element.parentElement) {
				if (floofy.parent_selector in element) {
					contextual_selector = element[floofy.parent_selector] + " " + contextual_selector;
				}
			}

			if (contextual_selector in floofy.element_register) {
				throw `Floofy: illegal attempt to overwrite for handler on "${contextual_selector}"`;
			}
			else {
				floofy.element_register[contextual_selector] = {
					signature: Symbol("floofy-element"),
					constructor: constructor
				};
			}

			if (typeof constructor === "function") {
				context.querySelectorAll(selector).forEach(element => {
					if (element instanceof HTMLElement) {
						element[floofy.parent_selector] = selector;

						constructor(element);
					}
				});
			}
			else {
				throw new TypeError(`constructor must be of type function, received ${typeof constructor}`);
			}
		}
	});

	Object.defineProperty(floof, "all", {
		get: () => Array.from(context.querySelectorAll(selector))
			.filter(node => node instanceof HTMLElement)
			.map(el => {
				el[floofy.parent_selector] = selector;
				return el;
			})
	});

	Object.defineProperty(floof, "first", {
		get: () => {
			let el = context.querySelector(selector);

			el[floofy.parent_selector] = selector;

			return el;
		}
	});

	return floof;
}

namespace floofy {
	export const parent_selector = Symbol("selector");
	export const element_register: { [selector: string]: { signature: symbol, constructor: (el: HTMLElement) => void } } = {};

	export const match_element = (el: HTMLElement) => {
		for (let selector in element_register) {
			if (!(element_register[selector].signature in el)) {
				if (el.matches(selector)) {
					el[floofy.parent_selector] = selector;

					element_register[selector].constructor(el);
					el[element_register[selector].signature] = "ready";
				}
			}
		}
	}

	let observer = new MutationObserver(mutations => {
		for (let mutation of mutations) {
			mutation.addedNodes.forEach(node => {
				if (node instanceof HTMLElement) {
					match_element(node);
				}
			});
		}
	});

	observer.observe(document, {
		childList: true,
		subtree: true
	});

	Object.defineProperty(String.prototype, "f", {
		get(): Floofy {
			return floofy(this);
		}
	});

	Object.defineProperty(HTMLElement.prototype, "f", {
		get: function() {
			return new Proxy(this, {
				get: (el, selector) => {
					if (typeof selector === "string") {
						return floofy(selector, el);
					}
					else {
						throw new TypeError("selector must be of type string");
					}
				}
			});
		}
	});

	let pages: { [url: string]: Page } = {};
	let page_stack: Page[] = [];

	const page_handler = (url: string): Page => {
		let segments = url.split("/").filter(seg => seg.length > 0);

		pages:
		for (let selector in pages) {
			let absolute = selector.endsWith("!");
			let selector_segments = selector.replace(/\!$/, "").split("/").filter(seg => seg.length > 0);
			let selector_index = 0;
			let processed_indices = 0;
			let url_index = 0;
			let skip = false;
			let state = {};

			while (selector_index < selector_segments.length) {
				let segment = segments[url_index];
				let selector_segment = selector_segments[selector_index];

				switch (selector_segment) {
					case segment:
						skip = false;
						break;
					case "*":
						break;
					case "**":
						skip = true;
						break;
					default:
						if (selector_segment.startsWith("$")) {
							state[selector_segment] = selector_index < segments.length && url_index < segments.length ? decodeURIComponent(segment) : "";
							skip = false;
							break;
						}
						else if (!skip) {
							continue pages;
						}
				}

				if (skip) {
					if (url_index === segments.length - 1) break;
				}
				else selector_index++;

				processed_indices++;
				url_index = Math.min(url_index + 1, segments.length - 1);
			}

			if (absolute && !skip && processed_indices <= segments.length - 1) continue;

			return data => {
				let back = pages[selector]({ ...state, ...history.state, ...data });

				if (typeof back === "function") page_stack.push(back);
			}
		}

		return () => undefined;
	}

	Object.defineProperty(Location.prototype, "f", {
		get: function() {
			return new Proxy(this, {
				get: (_location, url) => {
					if (typeof url === "string") {
						return (data: any) => {
							history.pushState(data, document.title, url);
							page_handler(url)(data || {});
						};
					}
				},
				set: (_location, page, value) => {
					if (typeof page === "string") {
						if (typeof value === "function") {
							pages[page] = value;
							return true;
						}
					}
				}
			})
		}
	});

	document.addEventListener("DOMContentLoaded", () => {
		page_handler(location.pathname)({});

		addEventListener("popstate", () => {
			if (page_stack.length > 0) page_stack.pop()({});

			page_handler(location.pathname)({});
		});
	});
}