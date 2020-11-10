function floofy(selector, context = document) {
    let floof = {};
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
        set: (constructor) => {
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
(function (floofy) {
    floofy.parent_selector = Symbol("selector");
    floofy.element_register = {};
    floofy.match_element = (el) => {
        for (let selector in floofy.element_register) {
            if (!(floofy.element_register[selector].signature in el)) {
                if (el.matches(selector)) {
                    el[floofy.parent_selector] = selector;
                    floofy.element_register[selector].constructor(el);
                    el[floofy.element_register[selector].signature] = "ready";
                }
            }
        }
    };
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
        get: function () {
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