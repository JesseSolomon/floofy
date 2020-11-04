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
        get: () => select(selector.split(/[\s>]/g).filter(sel => sel.length > 0), false)
    });
    Object.defineProperty(floof, "new", {
        get: () => select(selector.split(/[\s>]/g).filter(sel => sel.length > 0), true)
    });
    Object.defineProperty(floof, "for", {
        get: () => (() => undefined),
        set: (constructor) => {
            floofy.element_register[selector] = {
                signature: Symbol("floofy-element"),
                constructor: constructor
            };
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
(function (floofy) {
    floofy.element_register = {};
    floofy.match_element = (el) => {
        for (let selector in floofy.element_register) {
            if (!(floofy.element_register[selector].signature in el)) {
                if (el.matches(selector)) {
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
                if (selector_segment === segment) {
                    skip = false;
                    selector_index++;
                    processed_indices++;
                    url_index = Math.min(url_index + 1, segments.length - 1);
                    continue;
                }
                else if (selector_segment === "*") {
                    selector_index++;
                    processed_indices++;
                    url_index = Math.min(url_index + 1, segments.length - 1);
                    continue;
                }
                else if (selector_segment.startsWith("$")) {
                    state[selector_segment] = selector_index < segments.length && url_index < segments.length ? decodeURIComponent(segment) : "";
                    selector_index++;
                    processed_indices++;
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