function floofy(node, selector) {
    const floof = {};
    let element_register;
    let observer;
    if (floofy.element_register in node) {
        element_register = node[floofy.element_register];
    }
    else {
        element_register = node[floofy.element_register] = {};
    }
    if (floofy.mutation_observer in node) {
        observer = node[floofy.mutation_observer];
    }
    else {
        observer = new MutationObserver(mutations => {
            for (let mutation of mutations) {
                for (let node of Array.from(mutation.addedNodes)) {
                    if (node instanceof HTMLElement) {
                        for (let selector in element_register) {
                            if (!(element_register[selector].signature in node) && node.matches(selector)) {
                                node[element_register[selector].signature] = true;
                                element_register[selector].constructor(node);
                            }
                        }
                    }
                }
            }
        });
        observer.observe(node, {
            childList: true,
            subtree: true
        });
        node[floofy.mutation_observer] = observer;
    }
    const realize_element = (origin, selector, prefers_existing) => {
        let segments = selector.split(" ").map(seg => seg.trim()).filter(seg => seg.length > 0);
        let target = origin;
        for (let segment of segments) {
            if (segments.indexOf(segment) < segments.length - 1 || prefers_existing) {
                if (target instanceof Element || target instanceof Document) {
                    let found = target.querySelector(segment);
                    if (found) {
                        target = found;
                        continue;
                    }
                }
            }
            let generator = segment + "";
            let el;
            generator = generator.replace(/^[\w-_]+/, tag => {
                el = document.createElement(tag);
                return "";
            });
            if (!el)
                el = document.createElement("div");
            // Attributes
            generator = generator.replace(/\[[\w\-_]*(\s*=\s*)?([\w\-_]+|"((?!").)*"|'((?!').*)')\]/g, attr => {
                let [name, value] = attr.replace(/(^\[|\]$)/g, "").split("=").map(seg => seg.trim());
                if (value) {
                    value = value.replace(/(^"|"$)/g, "").replace(/(^'|'$)/g, "");
                }
                el.setAttribute(name, value || "");
                return "";
            });
            // ID
            generator = generator.replace(/(?<=#)[\w-_]+/g, id => {
                el.id = id;
                return "";
            });
            // Class
            generator = generator.replace(/(?<=.)[\w-_]+/g, cls => {
                el.classList.add(cls);
                return "";
            });
            target.appendChild(el);
            target = el;
        }
        return target instanceof HTMLElement ? target : undefined;
    };
    Object.defineProperty(floof, "for", {
        get: () => (() => undefined),
        set: (constructor) => {
            if (typeof constructor === "function") {
                if (selector in element_register) {
                    throw `Floofy Exception: cannot reassign "for" handler on selector "${selector}"`;
                }
                element_register[selector] = {
                    signature: Symbol(selector),
                    constructor: constructor,
                };
                for (let el of floof.all) {
                    constructor(el);
                }
            }
            else {
                throw `Floofy Exception: "for" constructor must by of type function, got ${typeof constructor}`;
            }
        }
    });
    Object.defineProperty(floof, "actual", {
        get: () => realize_element(node, selector, true)
    });
    Object.defineProperty(floof, "new", {
        get: () => realize_element(node, selector, false)
    });
    if (node instanceof Element || node instanceof Document) {
        Object.defineProperty(floof, "all", {
            get: () => Array.from(node.querySelectorAll(selector)).filter(node => node instanceof HTMLElement)
        });
        Object.defineProperty(floof, "first", {
            get: () => node.querySelector(selector)
        });
    }
    return floof;
}
(function (floofy) {
    floofy.element_register = Symbol("element_register");
    floofy.mutation_observer = Symbol("mutation_observer");
    floofy.page_register = {};
    Object.defineProperty(String.prototype, "f", {
        get() {
            return floofy(document, this);
        }
    });
    Object.defineProperty(Node.prototype, "f", {
        get() {
            return new Proxy({}, {
                get: (_target, selector) => {
                    if (typeof selector === "string") {
                        return floofy(this, selector);
                    }
                    else {
                        throw `Floofy Exception: selectors must be of type string, got ${typeof selector}`;
                    }
                }
            });
        }
    });
    Object.defineProperty(Location.prototype, "f", {
        get: () => new Proxy({}, {
            set: (_target, selector, handler) => {
                if (typeof handler === "function") {
                    if (typeof selector === "string") {
                        let segments = selector.split("/").filter(seg => seg.length > 0);
                        let obj = {
                            capture_groups: [],
                            handler: handler
                        };
                        let regex = "^\\/" + segments.map(seg => {
                            if (seg === "*")
                                return "(?:[\\w\\.\\-%~:/?#\\[\\]@!$&'\\(\\)*+,;]+)";
                            else if (seg.startsWith("$")) {
                                obj.capture_groups.push(seg);
                                return "([\\w\\.\\-%~:/?#\\[\\]@!$&'\\(\\)*+,;]+)";
                            }
                            else
                                return seg;
                        }).join("\\/") + "\\/?$";
                        if (regex in floofy.page_register) {
                            throw `Floofy Exception: location handler already exists on selector "${selector}"`;
                        }
                        floofy.page_register[regex] = obj;
                        return true;
                    }
                    else {
                        throw `Floofy Exception: location selector must be of type string, got ${typeof selector}`;
                    }
                }
                else {
                    throw `Floofy Exception: location handler must be of type function, got ${typeof handler}`;
                }
            },
            get: (_target, url) => {
                if (typeof url === "string") {
                    for (let regex in floofy.page_register) {
                        let match = url.match(new RegExp(regex));
                        if (match) {
                            return state => {
                                if (!state || typeof state === "object") {
                                    let query = {};
                                    for (let i = 0; i < floofy.page_register[regex].capture_groups.length; i++) {
                                        query[floofy.page_register[regex].capture_groups[i]] = decodeURIComponent(match[i + 1]);
                                    }
                                    let new_state = {
                                        ...(history.state ?? {}),
                                        ...(state ?? {}),
                                        ...query
                                    };
                                    if (location.pathname !== url) {
                                        history.pushState(new_state, document.title, url);
                                    }
                                    floofy.page_register[regex].handler(new_state);
                                }
                                else {
                                    throw `Floofy Exception: location state must be of type object, got ${typeof state}`;
                                }
                            };
                        }
                    }
                    return null;
                }
                else {
                    throw `Floofy Exception: URL selector must be of type string, got ${typeof url}`;
                }
            }
        })
    });
    addEventListener("DOMContentLoaded", () => {
        let current_page = location.f[location.pathname];
        if (current_page)
            current_page({});
        addEventListener("popstate", () => {
            let page = location.f[location.pathname];
            if (page)
                page({});
        });
    });
})(floofy || (floofy = {}));
//# sourceMappingURL=floofy.js.map