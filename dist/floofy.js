function floofy(selector, context = document) {
    let floof = {};
    let contextual_selector = (floofy.selector_path in context ? context[floofy.selector_path] + " " : "") + selector;
    const parse_element = (selector) => {
        let el = null;
        selector = selector.replace(/^[\w-_]+/, tag => {
            el = document.createElement(tag);
            return "";
        });
        if (!el)
            el = document.createElement("div");
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
    };
    const select = (selector, always_new) => {
        let next = context;
        for (let i = 0; i < selector.length; i++) {
            let segment = selector[i];
            let el = next.querySelector(segment);
            if ((!always_new || i !== selector.length - 1) && el) {
                next = el;
            }
            else {
                el = parse_element(segment);
                floofy.match_element(el);
                next.append(el);
                next = el;
            }
        }
        return next;
    };
    const meta = (element) => floofy.element_proxy(element, contextual_selector);
    Object.defineProperty(floof, "actual", {
        get: () => meta(select(selector.split(/[\s>]/g).filter(sel => sel.length > 0), false))
    });
    Object.defineProperty(floof, "new", {
        get: () => meta(select(selector.split(/[\s>]/g).filter(sel => sel.length > 0), true))
    });
    Object.defineProperty(floof, "for", {
        get: () => (() => undefined),
        set: (constructor) => {
            if (contextual_selector in floofy.element_register) {
                throw `Floofy: illegal attempt to overwrite for handler on "${contextual_selector}"`;
            }
            else {
                floofy.element_register[contextual_selector] = {
                    signature: Symbol("floofy-element"),
                    selector_path: contextual_selector,
                    constructor: constructor
                };
            }
            if (typeof constructor === "function") {
                context.querySelectorAll(selector).forEach(element => {
                    if (element instanceof HTMLElement) {
                        constructor(meta(element));
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
            .map(meta)
    });
    Object.defineProperty(floof, "first", {
        get: () => meta(context.querySelector(selector))
    });
    return floof;
}
(function (floofy) {
    floofy.selector_path = Symbol("selector");
    floofy.direct_element = Symbol("element");
    floofy.element_register = {};
    floofy.element_proxy = (element, selector) => new Proxy(element, {
        getPrototypeOf(target) {
            return Object.getPrototypeOf(target);
        },
        has(target, prop) {
            if (prop === floofy.selector_path || prop === floofy.direct_element || prop === "f")
                return true;
            else
                return prop in target;
        },
        get(target, prop) {
            if (prop === floofy.selector_path) {
                return selector;
            }
            else if (prop === floofy.direct_element) {
                return target;
            }
            else if (prop === "f") {
                return floofy_element(floofy.element_proxy(target, selector));
            }
            else {
                let value = target[prop];
                if (typeof value === "function") {
                    value = Function.prototype.bind.call(value, target);
                }
                return value;
            }
        },
        set(target, prop, value) {
            return target[prop] = value;
        },
        apply(target, args) {
            return Object.apply(target, args);
        },
        ownKeys(target) {
            return Object.keys(target);
        }
    });
    floofy.match_element = (el) => {
        for (let selector in floofy.element_register) {
            if (!(floofy.element_register[selector].signature in el)) {
                if (el.matches(selector)) {
                    floofy.element_register[selector].constructor(floofy.element_proxy(el, floofy.element_register[selector].selector_path));
                    el[floofy.element_register[selector].signature] = "ready";
                }
            }
        }
    };
    const floofy_element = (element) => new Proxy(element, {
        get: (el, selector) => {
            if (typeof selector === "string") {
                return floofy(selector, el);
            }
            else {
                throw new TypeError("selector must be of type string");
            }
        }
    });
    let observer = new MutationObserver(mutations => {
        for (let mutation of mutations) {
            mutation.addedNodes.forEach(node => {
                if (node instanceof HTMLElement) {
                    floofy.match_element(node);
                }
            });
        }
    });
    observer.observe(document, {
        childList: true,
        subtree: true
    });
    Object.defineProperty(String.prototype, "f", {
        get() {
            return floofy(this);
        }
    });
    Object.defineProperty(HTMLElement.prototype, "f", {
        get() {
            return floofy_element(this);
        }
    });
    let pages = {};
    let page_stack = [];
    const page_handler = (url) => {
        let segments = url.split("/").filter(seg => seg.length > 0);
        pages: for (let selector in pages) {
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
                    if (url_index === segments.length - 1)
                        break;
                }
                else
                    selector_index++;
                processed_indices++;
                url_index = Math.min(url_index + 1, segments.length - 1);
            }
            if (absolute && !skip && processed_indices <= segments.length - 1)
                continue;
            return data => {
                let back = pages[selector]({ ...state, ...history.state, ...data });
                if (typeof back === "function")
                    page_stack.push(back);
            };
        }
        return () => undefined;
    };
    Object.defineProperty(Location.prototype, "f", {
        get: function () {
            return new Proxy(this, {
                get: (_location, url) => {
                    if (typeof url === "string") {
                        return (data) => {
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
            });
        }
    });
    document.addEventListener("DOMContentLoaded", () => {
        page_handler(location.pathname)({});
        addEventListener("popstate", () => {
            if (page_stack.length > 0)
                page_stack.pop()({});
            page_handler(location.pathname)({});
        });
    });
})(floofy || (floofy = {}));
//# sourceMappingURL=floofy.js.map