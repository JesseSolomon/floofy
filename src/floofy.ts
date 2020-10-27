interface Floofy {
	/** Executes the given function on all current and future elements that match the selector */
	for: (el: HTMLElement) => void;

	/** Returns the requested element, if it doesn't exist, it will be created to best match the selector */
	actual: HTMLElement;

	/** Creates as few elements as possible to best matching the selector, unlike `actual`, this will create at least one element regardless of whether it already exists */
	new: HTMLElement;

	/** Returns all elements which match the selector, same as _querySelectorAll_ */
	all: NodeList;

	/** Returns the first element which matches the selector, same as _querySelector_ */
	first?: HTMLElement;
}

/** Handlers for url-based page selection */
type Page<T = any> = (data: T) => void;

/** A context for floofy selectors */
type Floofle = { [selector: string]: Floofy };

interface String {
	/**
	 * Convert this string into a floofy selector
	 * @deprecated
	 * */
	readonly floofy: Floofy;
	readonly f: Floofy;
}

interface HTMLElement {
	/**
	 * Returns this elements floofy context
	 * @deprecated
	 * */
	readonly floofle: Floofle;
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
				next.append(el);
				next = el;
			}
		}

		return next;
	}

	Object.defineProperty(floof, "actual", {
		get: () => select(selector.split(/[\s>]/g).filter(sel => sel.length > 0), false)
	});
	
	Object.defineProperty(floof, "new", {
		get: () => select(selector.split(/[\s>]/g).filter(sel => sel.length > 0), true)
	});
	
	Object.defineProperty(floof, "for", {
		get: () => (() => undefined),
		set: (constructor: (el: HTMLElement) => void) => {
			let observer = new MutationObserver(mutations => {
				for (let mutation of mutations) {
					mutation.addedNodes.forEach(node => {
						if (node instanceof HTMLElement && node.matches(selector)) {
							constructor(node);
						}
					});
				}
			});

			observer.observe(context as HTMLElement, {
				childList: true,
				subtree: true
			});

			if (typeof constructor === "function") {
				context.querySelectorAll(selector).forEach(element => {
					if (element instanceof HTMLElement) {
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
		get: () => context.querySelectorAll(selector)
	});

	Object.defineProperty(floof, "first", {
		get: () => context.querySelector(selector)
	});

	return floof;
}

namespace floofy {
	Object.defineProperty(String.prototype, "floofy", {
		get(): Floofy {
			console.warn("String.prototype.floofy is depreciated and may be removed in future versions");
			return floofy(this);
		}
	});

	Object.defineProperty(String.prototype, "f", {
		get(): Floofy {
			return floofy(this);
		}
	});

	Object.defineProperty(HTMLElement.prototype, "floofle", {
		get: function() {
			console.warn("HTMLElement.prototype.floofle is depreciated and may be removed in future versions");
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

	let pages: { [url: string]: (data: any) => void } = {};

	const page_handler = (url: string): ((data: any) => void) => {
		let segments = url.split("/").filter(seg => seg.length > 0);

		pages:
		for (let selector in pages) {
			let selector_segments = selector.split("/").filter(seg => seg.length > 0);
			let selector_index = 0;
			let url_index = 0;
			let skip = false;
			let state = {};

			while (selector_index < selector_segments.length) {
				let segment = segments[url_index];
				let selector_segment = selector_segments[selector_index];

				if (selector_segment === segment) {
					skip = false;
					selector_index++;
					url_index = Math.min(url_index + 1, segments.length - 1);

					continue;
				}
				else if (selector_segment === "*") {
					selector_index++;
					url_index = Math.min(url_index + 1, segments.length - 1);
					
					continue;
				}
				else if (selector_segment.startsWith("$")) {
					state[selector_segment] = selector_index < segments.length && url_index < segments.length ? decodeURIComponent(segment) : "";
					selector_index++;
					url_index = Math.min(url_index + 1, segments.length - 1);

					continue;
				}
				else if (selector_segment === "**") {
					selector_index++;
					skip = true;
					url_index = Math.min(url_index + 1, segments.length - 1);

					continue;
				}
				else if (skip && url_index === segments.length - 1) {
					continue pages;
				}
				else if (!skip) {
					continue pages;
				}

				url_index = Math.min(url_index + 1, segments.length - 1);
			}

			return data => pages[selector]({ ...state, ...history.state, ...data });
		}
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
		let current_page = page_handler(location.pathname);
	
		if (current_page) current_page({});

		addEventListener("popstate", () => page_handler(location.pathname)({}));
	});
}