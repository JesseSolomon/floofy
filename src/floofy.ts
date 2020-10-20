interface Floofy {
	/** Executes the given function on all current and future elements that match the selector */
	for: (el: HTMLElement) => void;

	/** Returns the requested element, if it doesn't exist, it will be created to best match the selector */
	actual: HTMLElement;

	/** Creates as few elements as possible to best matching the selector, unlike `actual`, this will create at least one element regardless of whether it already exists */
	new: HTMLElement

	/** Returns all elements which match the selector, same as _querySelectorAll_ */
	all: NodeList;

	/** Returns the first element which matches the selector, same as _querySelector_ */
	first?: HTMLElement;
}

/** A context for floofy selectors */
type Floofle = { [selector: string]: Floofy };

interface String {
	/** Convert this string into a floofy selector */
	readonly floofy: Floofy;
}

interface HTMLElement {
	/** Returns this elements floofy context */
	readonly floofle: Floofle;
}

const floofy = (selector: string, context: ParentNode = document): Floofy => {
	let floof = {} as Floofy;

	const realize_selector = (prefers_existing: boolean) => {
		let working_selector = selector.replace(/\s*>\s*/g, ">").replace(/\s\s+/g, " ");
		let parent: HTMLElement = context as HTMLElement;
		let el: HTMLElement = null;

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

		if (prefers_existing) {
			el = parent.querySelector(working_selector);
		}

		while ((el === null || !prefers_existing) && working_selector) {
			let breakpoint = Math.min(...[working_selector.indexOf(">"), working_selector.indexOf(" "), working_selector.length].filter(i => i > -1));
			let current = working_selector.slice(0, breakpoint).trim();
			working_selector = working_selector.slice(breakpoint + 1).trim();

			let next = parent.querySelector<HTMLElement>(current);

			if ((!prefers_existing && working_selector) && next) {
				parent = next;
			}
			else {
				let new_element = parse_element(current);

				parent.appendChild(new_element);
				parent = new_element;

				if (working_selector && prefers_existing) {
					el = parent.querySelector(working_selector);
				}
				else {
					el = new_element;
				}
			}
		}

		console.log(el);

		return el;
	}

	Object.defineProperty(floof, "actual", {
		get: () => realize_selector(true)
	});
	
	Object.defineProperty(floof, "new", {
		get: () => realize_selector(false)
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

Object.defineProperty(String.prototype, "floofy", {
	get(): Floofy {
		return floofy(this);
	}
});

Object.defineProperty(HTMLElement.prototype, "floofle", {
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
